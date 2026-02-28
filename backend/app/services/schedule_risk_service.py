import json
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from uuid import UUID

from google import genai
from google.genai import types
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.task import Task, TaskDependency


async def calculate_critical_path(db: AsyncSession, project_id: UUID) -> dict:
    """
    Calculate the critical path for a project using network analysis.

    Returns:
        dict with:
        - task_ids: list of UUID for tasks on critical path
        - total_duration: float total project duration in days
        - critical_tasks: list of dicts with full task info
    """
    # Fetch all tasks for the project with dependencies
    query = (
        select(Task)
        .where(Task.project_id == project_id)
        .options(selectinload(Task.dependencies))
    )
    result = await db.execute(query)
    tasks = result.scalars().all()

    if not tasks:
        return {
            "task_ids": [],
            "total_duration": 0.0,
            "critical_tasks": [],
        }

    # Build task map and dependency graph
    task_map = {task.id: task for task in tasks}
    task_ids = list(task_map.keys())

    # Fetch all dependencies for these tasks
    dep_query = select(TaskDependency).where(
        TaskDependency.task_id.in_(task_ids)
    )
    dep_result = await db.execute(dep_query)
    dependencies = dep_result.scalars().all()

    # Build adjacency lists
    # predecessors[task] = list of tasks that must finish before this task starts
    # successors[task] = list of tasks that depend on this task
    predecessors = defaultdict(list)
    successors = defaultdict(list)

    for dep in dependencies:
        if dep.task_id in task_map and dep.depends_on_id in task_map:
            predecessors[dep.task_id].append(dep.depends_on_id)
            successors[dep.depends_on_id].append(dep.task_id)

    # Calculate duration for each task (in days)
    def get_task_duration(task: Task) -> float:
        if task.start_date and task.due_date:
            delta = task.due_date - task.start_date
            return max(1.0, float(delta.days))
        elif task.estimated_hours:
            # Assume 8-hour workday
            return max(1.0, task.estimated_hours / 8.0)
        else:
            return 1.0  # Default 1 day

    durations = {task.id: get_task_duration(task) for task in tasks}

    # Forward pass: calculate earliest start (ES) and earliest finish (EF)
    earliest_start = {}
    earliest_finish = {}

    # Find starting tasks (no predecessors)
    start_tasks = [tid for tid in task_ids if not predecessors[tid]]
    if not start_tasks:
        # Handle circular dependencies - pick tasks arbitrarily
        start_tasks = task_ids[:1]

    # Topological sort using Kahn's algorithm
    in_degree = {tid: len(predecessors[tid]) for tid in task_ids}
    queue = deque([tid for tid in task_ids if in_degree[tid] == 0])
    topo_order = []

    while queue:
        tid = queue.popleft()
        topo_order.append(tid)
        for successor_id in successors[tid]:
            in_degree[successor_id] -= 1
            if in_degree[successor_id] == 0:
                queue.append(successor_id)

    # If we didn't process all tasks, there's a cycle - add remaining tasks
    if len(topo_order) < len(task_ids):
        for tid in task_ids:
            if tid not in topo_order:
                topo_order.append(tid)

    # Forward pass
    for tid in topo_order:
        if not predecessors[tid]:
            earliest_start[tid] = 0.0
        else:
            # ES = max(EF of all predecessors)
            earliest_start[tid] = max(
                earliest_finish.get(pred_id, 0.0)
                for pred_id in predecessors[tid]
            )
        earliest_finish[tid] = earliest_start[tid] + durations[tid]

    # Find project end time
    project_duration = max(earliest_finish.values()) if earliest_finish else 0.0

    # Backward pass: calculate latest start (LS) and latest finish (LF)
    latest_start = {}
    latest_finish = {}

    # Find ending tasks (no successors)
    end_tasks = [tid for tid in task_ids if not successors[tid]]

    # Initialize ending tasks
    for tid in end_tasks:
        latest_finish[tid] = project_duration

    # Backward pass through reverse topological order
    for tid in reversed(topo_order):
        if not successors[tid]:
            latest_finish[tid] = project_duration
        else:
            # LF = min(LS of all successors)
            latest_finish[tid] = min(
                latest_start.get(succ_id, project_duration)
                for succ_id in successors[tid]
            )
        latest_start[tid] = latest_finish[tid] - durations[tid]

    # Calculate slack and identify critical path
    slack = {
        tid: latest_start[tid] - earliest_start[tid]
        for tid in task_ids
    }

    # Critical path tasks have zero (or near-zero) slack
    critical_task_ids = [
        tid for tid in task_ids
        if abs(slack[tid]) < 0.01  # Allow for floating point errors
    ]

    # Sort critical tasks by earliest start time
    critical_task_ids.sort(key=lambda tid: earliest_start[tid])

    # Build detailed critical task info
    critical_tasks = []
    for tid in critical_task_ids:
        task = task_map[tid]
        critical_tasks.append({
            "task_id": tid,
            "task_title": task.title,
            "start_date": task.start_date,
            "due_date": task.due_date,
            "duration_days": durations[tid],
            "slack_days": slack[tid],
            "earliest_start": earliest_start[tid],
            "earliest_finish": earliest_finish[tid],
        })

    return {
        "task_ids": critical_task_ids,
        "total_duration": project_duration,
        "critical_tasks": critical_tasks,
    }


async def calculate_historical_variance(db: AsyncSession, project_id: UUID) -> dict:
    """
    Analyze completed tasks to calculate historical variance and delay factors.

    Returns:
        dict with:
        - average_delay_factor: float (ratio of actual/estimated, >1.0 = delays)
        - variance_by_assignee: dict mapping assignee_id to delay factor
        - variance_by_priority: dict mapping priority to delay factor
        - variance_by_milestone: dict with milestone vs regular task variance
        - total_completed_tasks: int
        - tasks_with_variance_data: int
    """
    # Query completed tasks with both estimated and actual hours
    query = (
        select(Task)
        .where(
            Task.project_id == project_id,
            Task.status == "completed",
            Task.estimated_hours.is_not(None),
            Task.actual_hours.is_not(None),
            Task.estimated_hours > 0,  # Avoid division by zero
        )
    )
    result = await db.execute(query)
    tasks = result.scalars().all()

    if not tasks:
        return {
            "average_delay_factor": 1.0,
            "variance_by_assignee": {},
            "variance_by_priority": {},
            "variance_by_milestone": {"milestone": 1.0, "regular": 1.0},
            "total_completed_tasks": 0,
            "tasks_with_variance_data": 0,
        }

    # Calculate variance for each task
    task_variances = []
    assignee_variances = defaultdict(list)
    priority_variances = defaultdict(list)
    milestone_variances = {"milestone": [], "regular": []}

    for task in tasks:
        # Calculate delay factor: actual / estimated
        # > 1.0 means task took longer than estimated
        delay_factor = task.actual_hours / task.estimated_hours
        task_variances.append(delay_factor)

        # Group by assignee
        if task.assignee_id:
            assignee_variances[str(task.assignee_id)].append(delay_factor)

        # Group by priority
        if task.priority:
            priority_variances[task.priority].append(delay_factor)

        # Group by milestone status
        if task.is_milestone:
            milestone_variances["milestone"].append(delay_factor)
        else:
            milestone_variances["regular"].append(delay_factor)

    # Calculate average delay factor
    average_delay_factor = sum(task_variances) / len(task_variances) if task_variances else 1.0

    # Calculate averages for each dimension
    variance_by_assignee = {
        assignee_id: sum(variances) / len(variances)
        for assignee_id, variances in assignee_variances.items()
    }

    variance_by_priority = {
        priority: sum(variances) / len(variances)
        for priority, variances in priority_variances.items()
    }

    variance_by_milestone = {
        "milestone": (
            sum(milestone_variances["milestone"]) / len(milestone_variances["milestone"])
            if milestone_variances["milestone"]
            else 1.0
        ),
        "regular": (
            sum(milestone_variances["regular"]) / len(milestone_variances["regular"])
            if milestone_variances["regular"]
            else 1.0
        ),
    }

    # Get total completed tasks count (including those without variance data)
    total_completed_query = (
        select(func.count(Task.id))
        .where(
            Task.project_id == project_id,
            Task.status == "completed",
        )
    )
    total_result = await db.execute(total_completed_query)
    total_completed = total_result.scalar() or 0

    return {
        "average_delay_factor": average_delay_factor,
        "variance_by_assignee": variance_by_assignee,
        "variance_by_priority": variance_by_priority,
        "variance_by_milestone": variance_by_milestone,
        "total_completed_tasks": total_completed,
        "tasks_with_variance_data": len(tasks),
    }


async def calculate_confidence_score(db: AsyncSession, project_id: UUID) -> dict:
    """
    Calculate confidence score for schedule predictions based on historical data.

    The confidence score measures how reliable schedule predictions are, based on:
    - Sample size (more completed tasks = higher confidence)
    - Estimation consistency (lower variance = higher confidence)
    - Data completeness (percentage of tasks with estimates)

    Returns:
        dict with:
        - confidence_score: float (0.0-1.0, where 1.0 is highest confidence)
        - sample_size_score: float (0.0-1.0)
        - consistency_score: float (0.0-1.0)
        - completeness_score: float (0.0-1.0)
        - total_tasks: int
        - completed_tasks: int
        - tasks_with_estimates: int
    """
    # Get all tasks for the project
    all_tasks_query = select(func.count(Task.id)).where(Task.project_id == project_id)
    all_tasks_result = await db.execute(all_tasks_query)
    total_tasks = all_tasks_result.scalar() or 0

    if total_tasks == 0:
        return {
            "confidence_score": 0.0,
            "sample_size_score": 0.0,
            "consistency_score": 0.0,
            "completeness_score": 0.0,
            "total_tasks": 0,
            "completed_tasks": 0,
            "tasks_with_estimates": 0,
        }

    # Get completed tasks count
    completed_query = (
        select(func.count(Task.id))
        .where(Task.project_id == project_id, Task.status == "completed")
    )
    completed_result = await db.execute(completed_query)
    completed_tasks = completed_result.scalar() or 0

    # Get historical variance data
    variance_data = await calculate_historical_variance(db, project_id)
    tasks_with_estimates = variance_data["tasks_with_variance_data"]

    # Calculate sample size score (0-1, based on number of completed tasks)
    # 30+ completed tasks with estimates = 1.0, scales linearly below that
    sample_size_threshold = 30
    sample_size_score = min(1.0, tasks_with_estimates / sample_size_threshold) if tasks_with_estimates > 0 else 0.0

    # Calculate consistency score (0-1, based on variance from 1.0)
    # Lower variance = higher consistency
    # If average_delay_factor is close to 1.0, estimates are accurate
    avg_delay = variance_data["average_delay_factor"]
    variance_from_ideal = abs(avg_delay - 1.0)
    # Cap variance at 2.0 for scoring purposes
    # 0.0 variance = 1.0 score, 2.0 variance = 0.0 score
    consistency_score = max(0.0, 1.0 - (variance_from_ideal / 2.0)) if tasks_with_estimates > 0 else 0.0

    # Calculate completeness score (0-1, based on percentage of tasks with estimates)
    tasks_with_est_query = (
        select(func.count(Task.id))
        .where(
            Task.project_id == project_id,
            Task.estimated_hours.is_not(None),
            Task.estimated_hours > 0,
        )
    )
    est_result = await db.execute(tasks_with_est_query)
    total_with_estimates = est_result.scalar() or 0
    completeness_score = total_with_estimates / total_tasks if total_tasks > 0 else 0.0

    # Calculate overall confidence score (weighted average)
    # Sample size: 30% - need historical data
    # Consistency: 40% - most important for predictions
    # Completeness: 30% - need estimates to make predictions
    confidence_score = (
        0.3 * sample_size_score +
        0.4 * consistency_score +
        0.3 * completeness_score
    )

    return {
        "confidence_score": round(confidence_score, 3),
        "sample_size_score": round(sample_size_score, 3),
        "consistency_score": round(consistency_score, 3),
        "completeness_score": round(completeness_score, 3),
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "tasks_with_estimates": tasks_with_estimates,
    }


MITIGATION_PROMPT = """You are a construction project schedule risk management expert. Analyze the provided schedule risk data and generate actionable mitigation strategies.

## Risk Data Provided:
{risk_data}

## Your Task:
Generate concrete, actionable mitigation strategies to reduce schedule risks. For each suggestion:
1. **strategy**: Clear, specific action to take (2-3 sentences)
2. **priority**: high, medium, or low (based on impact and urgency)
3. **impact**: Expected impact on schedule risk (e.g., "Reduces critical path by 5-10 days", "Improves confidence score by 20%")
4. **effort**: low, medium, or high (implementation effort required)
5. **target_tasks**: List of task titles this suggestion applies to (if specific), or ["general"] if project-wide
6. **risk_category**: One of: critical_path, resource_allocation, estimation_accuracy, dependency_management, milestone_risk

## Guidelines:
- Prioritize suggestions that address critical path tasks
- Consider historical variance patterns (high variance = focus on estimation improvement)
- If confidence score is low, suggest strategies to improve data collection
- If specific assignees show high variance, suggest mentoring or workload balancing
- For milestone tasks with delays, suggest buffer time or early-start strategies
- Maximum 8 suggestions, focus on highest impact items
- Be specific: instead of "improve planning", say "add 20% buffer to critical path tasks with assignees showing >1.3 delay factor"

## Output Format:
Return ONLY a valid JSON array. Each element must have exactly these keys:
[{{
  "strategy": "...",
  "priority": "high|medium|low",
  "impact": "...",
  "effort": "low|medium|high",
  "target_tasks": ["task1", "task2"] or ["general"],
  "risk_category": "critical_path|resource_allocation|estimation_accuracy|dependency_management|milestone_risk"
}}, ...]

Respond in {language} language for all text fields (strategy, impact)."""


def validate_mitigation_item(item: dict) -> dict:
    """Validate and normalize a mitigation suggestion item."""
    if not isinstance(item, dict):
        return {
            "strategy": "",
            "priority": "medium",
            "impact": "",
            "effort": "medium",
            "target_tasks": ["general"],
            "risk_category": "critical_path",
        }

    valid_priorities = ("high", "medium", "low")
    valid_efforts = ("low", "medium", "high")
    valid_categories = (
        "critical_path",
        "resource_allocation",
        "estimation_accuracy",
        "dependency_management",
        "milestone_risk",
    )

    priority = item.get("priority", "medium")
    if priority not in valid_priorities:
        priority = "medium"

    effort = item.get("effort", "medium")
    if effort not in valid_efforts:
        effort = "medium"

    risk_category = item.get("risk_category", "critical_path")
    if risk_category not in valid_categories:
        risk_category = "critical_path"

    target_tasks = item.get("target_tasks", ["general"])
    if not isinstance(target_tasks, list):
        target_tasks = ["general"]

    return {
        "strategy": item.get("strategy", ""),
        "priority": priority,
        "impact": item.get("impact", ""),
        "effort": effort,
        "target_tasks": target_tasks,
        "risk_category": risk_category,
    }


def parse_mitigation_response(text: str) -> list[dict]:
    """Parse and validate AI response for mitigation suggestions."""
    # Remove markdown code blocks if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3].strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return [{
            "strategy": "Unable to generate mitigation suggestions",
            "priority": "medium",
            "impact": "N/A",
            "effort": "medium",
            "target_tasks": ["general"],
            "risk_category": "critical_path",
        }]

    # Ensure it's a list
    if isinstance(parsed, dict):
        parsed = [parsed]
    if not isinstance(parsed, list):
        return [{
            "strategy": "Invalid response format",
            "priority": "medium",
            "impact": "N/A",
            "effort": "medium",
            "target_tasks": ["general"],
            "risk_category": "critical_path",
        }]

    # Validate and limit to 8 suggestions
    validated = [validate_mitigation_item(item) for item in parsed[:8]]

    # Filter out empty strategies
    validated = [item for item in validated if item["strategy"]]

    return validated if validated else [{
        "strategy": "No specific mitigation suggestions generated",
        "priority": "medium",
        "impact": "N/A",
        "effort": "medium",
        "target_tasks": ["general"],
        "risk_category": "critical_path",
    }]


def generate_mitigation_suggestions(
    critical_path: dict,
    variance_data: dict,
    confidence_data: dict,
    language: str = "en",
) -> dict:
    """
    Generate AI-powered mitigation suggestions for schedule risks.

    Args:
        critical_path: Result from calculate_critical_path
        variance_data: Result from calculate_historical_variance
        confidence_data: Result from calculate_confidence_score
        language: Language for suggestions ("en" or "he")

    Returns:
        dict with:
        - suggestions: list of mitigation strategy dicts
        - processing_time_ms: int processing time
        - model_used: str model name
    """
    settings = get_settings()
    api_key = settings.gemini_api_key
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    # Format risk data for AI analysis
    risk_summary = {
        "critical_path_duration": critical_path.get("total_duration", 0),
        "critical_tasks_count": len(critical_path.get("critical_tasks", [])),
        "critical_tasks": [
            {
                "title": task["task_title"],
                "duration_days": task["duration_days"],
                "slack_days": task["slack_days"],
            }
            for task in critical_path.get("critical_tasks", [])[:10]  # Limit to top 10
        ],
        "average_delay_factor": variance_data.get("average_delay_factor", 1.0),
        "variance_by_priority": variance_data.get("variance_by_priority", {}),
        "variance_by_milestone": variance_data.get("variance_by_milestone", {}),
        "confidence_score": confidence_data.get("confidence_score", 0.0),
        "sample_size_score": confidence_data.get("sample_size_score", 0.0),
        "consistency_score": confidence_data.get("consistency_score", 0.0),
        "completeness_score": confidence_data.get("completeness_score", 0.0),
        "total_tasks": confidence_data.get("total_tasks", 0),
        "completed_tasks": confidence_data.get("completed_tasks", 0),
    }

    lang_name = {"en": "English", "he": "Hebrew"}.get(language, "English")
    prompt = MITIGATION_PROMPT.format(
        risk_data=json.dumps(risk_summary, indent=2, default=str),
        language=lang_name,
    )

    client = genai.Client(api_key=api_key)
    model_name = settings.gemini_model

    contents = [
        prompt + "\n\nRespond ONLY with valid JSON, no markdown formatting.",
    ]

    start = time.time()
    response = client.models.generate_content(model=model_name, contents=contents)
    elapsed_ms = int((time.time() - start) * 1000)

    if not response.text:
        return {
            "suggestions": [{
                "strategy": "Unable to generate suggestions - empty response",
                "priority": "medium",
                "impact": "N/A",
                "effort": "medium",
                "target_tasks": ["general"],
                "risk_category": "critical_path",
            }],
            "processing_time_ms": elapsed_ms,
            "model_used": model_name,
        }

    suggestions = parse_mitigation_response(response.text.strip())

    return {
        "suggestions": suggestions,
        "processing_time_ms": elapsed_ms,
        "model_used": model_name,
    }


async def simulate_scenario(
    db: AsyncSession,
    project_id: UUID,
    scenario_changes: dict,
) -> dict:
    """
    Simulate what-if scenarios for schedule risk analysis.

    Allows testing different scenarios by adjusting task durations, removing tasks,
    adding buffer time, or changing resource efficiency.

    Args:
        db: Database session
        project_id: Project UUID
        scenario_changes: dict with scenario parameters:
            - task_duration_adjustments: dict mapping str(task_id) to multiplier (e.g., {"uuid": 1.5})
            - remove_tasks: list of task_id UUIDs to exclude from simulation
            - add_buffer_percentage: float (e.g., 0.2 for 20% buffer on critical path tasks)
            - resource_changes: dict mapping str(assignee_id) to efficiency multiplier (e.g., {"uuid": 0.8})

    Returns:
        dict with:
        - baseline: dict with original schedule metrics (total_duration, critical_task_count)
        - scenario: dict with simulated schedule metrics
        - delta: dict with changes (duration_change_days, critical_path_change, etc.)
        - impacted_tasks: list of dicts with task changes
        - recommendations: list of insights based on simulation
    """
    # Fetch all tasks for the project with dependencies
    query = (
        select(Task)
        .where(Task.project_id == project_id)
        .options(selectinload(Task.dependencies))
    )
    result = await db.execute(query)
    all_tasks = result.scalars().all()

    if not all_tasks:
        return {
            "baseline": {"total_duration": 0.0, "critical_task_count": 0},
            "scenario": {"total_duration": 0.0, "critical_task_count": 0},
            "delta": {"duration_change_days": 0.0, "critical_path_change": 0},
            "impacted_tasks": [],
            "recommendations": ["No tasks found in project"],
        }

    # Calculate baseline critical path
    baseline_cp = await calculate_critical_path(db, project_id)
    baseline_critical_ids = set(baseline_cp["task_ids"])

    # Extract scenario parameters
    duration_adjustments = scenario_changes.get("task_duration_adjustments", {})
    remove_task_ids = set(scenario_changes.get("remove_tasks", []))
    buffer_percentage = scenario_changes.get("add_buffer_percentage", 0.0)
    resource_changes = scenario_changes.get("resource_changes", {})

    # Build task map and dependency graph for simulation
    task_map = {task.id: task for task in all_tasks if task.id not in remove_task_ids}
    task_ids = list(task_map.keys())

    # Fetch dependencies (excluding removed tasks)
    dep_query = select(TaskDependency).where(
        TaskDependency.task_id.in_(task_ids)
    )
    dep_result = await db.execute(dep_query)
    dependencies = dep_result.scalars().all()

    # Build adjacency lists
    predecessors = defaultdict(list)
    successors = defaultdict(list)

    for dep in dependencies:
        if (dep.task_id in task_map and
            dep.depends_on_id in task_map and
            dep.depends_on_id not in remove_task_ids):
            predecessors[dep.task_id].append(dep.depends_on_id)
            successors[dep.depends_on_id].append(dep.task_id)

    # Calculate adjusted durations for simulation
    def get_simulated_duration(task: Task) -> float:
        # Base duration
        if task.start_date and task.due_date:
            delta = task.due_date - task.start_date
            base_duration = max(1.0, float(delta.days))
        elif task.estimated_hours:
            base_duration = max(1.0, task.estimated_hours / 8.0)
        else:
            base_duration = 1.0

        # Apply task-specific duration adjustment
        task_id_str = str(task.id)
        if task_id_str in duration_adjustments:
            base_duration *= duration_adjustments[task_id_str]

        # Apply resource efficiency multiplier
        if task.assignee_id:
            assignee_id_str = str(task.assignee_id)
            if assignee_id_str in resource_changes:
                # Lower efficiency (e.g., 0.8) means tasks take longer (divide by efficiency)
                efficiency = resource_changes[assignee_id_str]
                if efficiency > 0:
                    base_duration /= efficiency

        # Apply buffer to critical path tasks if requested
        if buffer_percentage > 0 and task.id in baseline_critical_ids:
            base_duration *= (1.0 + buffer_percentage)

        return base_duration

    durations = {task.id: get_simulated_duration(task) for task in task_map.values()}

    # Perform critical path calculation with simulated durations
    # Forward pass
    earliest_start = {}
    earliest_finish = {}

    # Topological sort
    in_degree = {tid: len(predecessors[tid]) for tid in task_ids}
    queue = deque([tid for tid in task_ids if in_degree[tid] == 0])
    topo_order = []

    while queue:
        tid = queue.popleft()
        topo_order.append(tid)
        for successor_id in successors[tid]:
            in_degree[successor_id] -= 1
            if in_degree[successor_id] == 0:
                queue.append(successor_id)

    # Handle cycles
    if len(topo_order) < len(task_ids):
        for tid in task_ids:
            if tid not in topo_order:
                topo_order.append(tid)

    # Forward pass
    for tid in topo_order:
        if not predecessors[tid]:
            earliest_start[tid] = 0.0
        else:
            earliest_start[tid] = max(
                earliest_finish.get(pred_id, 0.0)
                for pred_id in predecessors[tid]
            )
        earliest_finish[tid] = earliest_start[tid] + durations[tid]

    # Calculate simulated project duration
    simulated_duration = max(earliest_finish.values()) if earliest_finish else 0.0

    # Backward pass
    latest_start = {}
    latest_finish = {}

    for tid in reversed(topo_order):
        if not successors[tid]:
            latest_finish[tid] = simulated_duration
        else:
            latest_finish[tid] = min(
                latest_start.get(succ_id, simulated_duration)
                for succ_id in successors[tid]
            )
        latest_start[tid] = latest_finish[tid] - durations[tid]

    # Calculate slack and identify new critical path
    slack = {
        tid: latest_start[tid] - earliest_start[tid]
        for tid in task_ids
    }

    simulated_critical_ids = [
        tid for tid in task_ids
        if abs(slack[tid]) < 0.01
    ]

    # Build impacted tasks list
    impacted_tasks = []
    for task_id in task_ids:
        task = task_map[task_id]
        task_id_str = str(task_id)

        # Determine what changed for this task
        changes = []
        if task_id_str in duration_adjustments:
            changes.append(f"duration adjusted by {duration_adjustments[task_id_str]}x")
        if task.assignee_id and str(task.assignee_id) in resource_changes:
            changes.append(f"resource efficiency: {resource_changes[str(task.assignee_id)]}x")
        if buffer_percentage > 0 and task_id in baseline_critical_ids:
            changes.append(f"buffer added: {buffer_percentage * 100}%")

        was_critical = task_id in baseline_critical_ids
        is_critical = task_id in simulated_critical_ids

        if changes or was_critical or is_critical:
            impacted_tasks.append({
                "task_id": task_id,
                "task_title": task.title,
                "baseline_critical": was_critical,
                "scenario_critical": is_critical,
                "baseline_duration": durations[task_id] / (1.0 + buffer_percentage) if buffer_percentage > 0 and was_critical else None,
                "scenario_duration": durations[task_id],
                "changes_applied": changes,
            })

    # Calculate deltas
    duration_change = simulated_duration - baseline_cp["total_duration"]
    critical_path_change = len(simulated_critical_ids) - len(baseline_critical_ids)

    # Generate recommendations
    recommendations = []
    if duration_change < 0:
        recommendations.append(
            f"Scenario reduces project duration by {abs(duration_change):.1f} days ({abs(duration_change) / baseline_cp['total_duration'] * 100:.1f}%)"
        )
    elif duration_change > 0:
        recommendations.append(
            f"Scenario increases project duration by {duration_change:.1f} days ({duration_change / baseline_cp['total_duration'] * 100:.1f}%)"
        )
    else:
        recommendations.append("Scenario has no impact on project duration")

    if critical_path_change > 0:
        recommendations.append(
            f"Scenario adds {critical_path_change} tasks to the critical path - consider optimization"
        )
    elif critical_path_change < 0:
        recommendations.append(
            f"Scenario removes {abs(critical_path_change)} tasks from critical path - improved flexibility"
        )

    if remove_task_ids:
        recommendations.append(
            f"Removed {len(remove_task_ids)} tasks from simulation"
        )

    if buffer_percentage > 0:
        buffer_days = baseline_cp["total_duration"] * buffer_percentage
        recommendations.append(
            f"Added {buffer_percentage * 100}% buffer ({buffer_days:.1f} days) to critical path tasks"
        )

    return {
        "baseline": {
            "total_duration": baseline_cp["total_duration"],
            "critical_task_count": len(baseline_critical_ids),
        },
        "scenario": {
            "total_duration": simulated_duration,
            "critical_task_count": len(simulated_critical_ids),
        },
        "delta": {
            "duration_change_days": duration_change,
            "critical_path_change": critical_path_change,
            "duration_change_percentage": (
                (duration_change / baseline_cp["total_duration"] * 100)
                if baseline_cp["total_duration"] > 0
                else 0.0
            ),
        },
        "impacted_tasks": impacted_tasks,
        "recommendations": recommendations,
    }
