from collections import defaultdict, deque
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
