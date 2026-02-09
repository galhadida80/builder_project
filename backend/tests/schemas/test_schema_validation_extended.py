import uuid
import pytest
from pydantic import ValidationError
from app.schemas.chat import ChatMessageRequest
from app.schemas.document_review import (
    DocumentCommentCreate, DocumentCommentUpdate, DocumentReviewUpdate,
)
from app.schemas.inspection_template import (
    InspectionStageTemplateCreate, InspectionFindingCreate,
)
from app.schemas.equipment_template import ConsultantTypeCreate

UID = str(uuid.uuid4())
XSS = [
    '<script>alert("x")</script>', '<iframe src="e">', '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)></svg>', 'javascript:alert(1)', '<object data="e">',
    '<embed src="e">', '<link rel="stylesheet" href="e">', '<style>body{}</style>',
]
TAGS = ["<script", "<iframe", "<img", "<svg", "javascript:", "<object", "<embed"]


def chk(text):
    for t in TAGS:
        assert t not in text


def stg(**kw):
    d = dict(consultant_type_id=uuid.uuid4(), name="Stage A", name_he="שלב א", display_order=0)
    d.update(kw)
    return InspectionStageTemplateCreate(**d)


def fnd(**kw):
    d = dict(inspection_id=uuid.uuid4(), finding_type="safety", severity="high",
             description="Crack in wall foundation", status="open")
    d.update(kw)
    return InspectionFindingCreate(**d)


def cns(**kw):
    d = dict(name="Structural Engineer", name_he="מהנדס מבנים", category="Engineering")
    d.update(kw)
    return ConsultantTypeCreate(**d)


class TestChatMessageRequest:
    def test_valid(self):
        assert ChatMessageRequest(message="Hello").message == "Hello"
    def test_empty_rejected(self):
        with pytest.raises(ValidationError):
            ChatMessageRequest(message="")
    @pytest.mark.parametrize("t", ["a", "ab", "a" * 2000])
    def test_boundary(self, t):
        assert ChatMessageRequest(message=t).message == t
    def test_exceeds_max(self):
        with pytest.raises(ValidationError):
            ChatMessageRequest(message="a" * 2001)
    def test_conv_id_none(self):
        assert ChatMessageRequest(message="hi").conversation_id is None
    def test_conv_id_uuid(self):
        u = uuid.uuid4()
        assert ChatMessageRequest(message="hi", conversation_id=u).conversation_id == u
    def test_conv_id_str(self):
        assert str(ChatMessageRequest(message="hi", conversation_id=UID).conversation_id) == UID
    def test_conv_id_invalid(self):
        with pytest.raises(ValidationError):
            ChatMessageRequest(message="hi", conversation_id="bad")
    def test_missing(self):
        with pytest.raises(ValidationError):
            ChatMessageRequest()
    def test_extra(self):
        assert not hasattr(ChatMessageRequest(message="hi", extra="x"), "extra")
    @pytest.mark.parametrize("v", [123, True, None, [], {}])
    def test_non_string(self, v):
        with pytest.raises(ValidationError):
            ChatMessageRequest(message=v)
    def test_whitespace(self):
        assert ChatMessageRequest(message="   ").message == "   "


class TestDocumentCommentCreate:
    def test_valid(self):
        assert DocumentCommentCreate(comment_text="Good").comment_text == "Good"
    def test_empty(self):
        with pytest.raises(ValidationError):
            DocumentCommentCreate(comment_text="")
    @pytest.mark.parametrize("t", ["x", "x" * 5000])
    def test_boundary(self, t):
        assert len(DocumentCommentCreate(comment_text=t).comment_text) <= 5000
    def test_exceeds(self):
        with pytest.raises(ValidationError):
            DocumentCommentCreate(comment_text="x" * 5001)
    def test_parent_none(self):
        assert DocumentCommentCreate(comment_text="hi").parent_comment_id is None
    def test_parent_uuid(self):
        u = uuid.uuid4()
        assert DocumentCommentCreate(comment_text="hi", parent_comment_id=u).parent_comment_id == u
    def test_parent_invalid(self):
        with pytest.raises(ValidationError):
            DocumentCommentCreate(comment_text="hi", parent_comment_id="bad")
    @pytest.mark.parametrize("x", XSS)
    def test_xss(self, x):
        chk(DocumentCommentCreate(comment_text=f"a {x} b").comment_text)
    def test_strip(self):
        assert DocumentCommentCreate(comment_text="  hello  ").comment_text == "hello"
    def test_missing(self):
        with pytest.raises(ValidationError):
            DocumentCommentCreate()


class TestDocumentCommentUpdate:
    def test_none(self):
        u = DocumentCommentUpdate()
        assert u.comment_text is None and u.is_resolved is None
    def test_text(self):
        assert DocumentCommentUpdate(comment_text="ok").comment_text == "ok"
    def test_empty(self):
        with pytest.raises(ValidationError):
            DocumentCommentUpdate(comment_text="")
    def test_bool(self):
        assert DocumentCommentUpdate(is_resolved=True).is_resolved is True
    @pytest.mark.parametrize("x", XSS[:3])
    def test_xss(self, x):
        chk(DocumentCommentUpdate(comment_text=f"s {x} t").comment_text)
    def test_exceeds(self):
        with pytest.raises(ValidationError):
            DocumentCommentUpdate(comment_text="x" * 5001)


class TestDocumentReviewUpdate:
    def test_none(self):
        u = DocumentReviewUpdate()
        assert u.status is None and u.reviewed_by_id is None
    def test_status(self):
        assert DocumentReviewUpdate(status="approved").status == "approved"
    def test_status_max(self):
        assert len(DocumentReviewUpdate(status="a" * 50).status) == 50
    def test_status_over(self):
        with pytest.raises(ValidationError):
            DocumentReviewUpdate(status="a" * 51)
    def test_reviewer_uuid(self):
        u = uuid.uuid4()
        assert DocumentReviewUpdate(reviewed_by_id=u).reviewed_by_id == u
    def test_reviewer_bad(self):
        with pytest.raises(ValidationError):
            DocumentReviewUpdate(reviewed_by_id="bad")


class TestInspectionStageTemplateCreate:
    def test_valid(self):
        assert stg().name == "Stage A"
    def test_desc_none(self):
        assert stg().description is None
    def test_desc_set(self):
        assert stg(description="Details").description == "Details"
    @pytest.mark.parametrize("o", [0, 1, 100, 999])
    def test_orders(self, o):
        assert stg(display_order=o).display_order == o
    def test_neg_order(self):
        with pytest.raises(ValidationError):
            stg(display_order=-1)
    @pytest.mark.parametrize("f", ["name", "name_he"])
    def test_short(self, f):
        with pytest.raises(ValidationError):
            stg(**{f: "x"})
    @pytest.mark.parametrize("f", ["name", "name_he"])
    def test_long(self, f):
        with pytest.raises(ValidationError):
            stg(**{f: "x" * 256})
    @pytest.mark.parametrize("f", ["name", "name_he"])
    def test_min(self, f):
        assert getattr(stg(**{f: "ab"}), f) == "ab"
    @pytest.mark.parametrize("f", ["name", "name_he"])
    def test_max(self, f):
        assert len(getattr(stg(**{f: "x" * 255}), f)) == 255
    def test_no_consultant(self):
        with pytest.raises(ValidationError):
            InspectionStageTemplateCreate(name="St", name_he="של", display_order=0)
    def test_no_name(self):
        with pytest.raises(ValidationError):
            InspectionStageTemplateCreate(consultant_type_id=uuid.uuid4(), name_he="של", display_order=0)
    @pytest.mark.parametrize("x", XSS[:3])
    def test_xss(self, x):
        chk(stg(name=f"S {x} N").name)
    def test_desc_over(self):
        with pytest.raises(ValidationError):
            stg(description="x" * 2001)
    def test_desc_max(self):
        assert len(stg(description="x" * 2000).description) == 2000
    def test_extra(self):
        assert not hasattr(stg(z="no"), "z")


class TestInspectionFindingCreate:
    def test_valid(self):
        assert fnd().finding_type == "safety"
    @pytest.mark.parametrize("f", ["finding_type", "severity", "status"])
    def test_empty(self, f):
        with pytest.raises(ValidationError):
            fnd(**{f: ""})
    @pytest.mark.parametrize("f", ["finding_type", "severity", "status"])
    def test_max50(self, f):
        assert len(getattr(fnd(**{f: "a" * 50}), f)) == 50
    @pytest.mark.parametrize("f", ["finding_type", "severity", "status"])
    def test_over50(self, f):
        with pytest.raises(ValidationError):
            fnd(**{f: "a" * 51})
    def test_desc_min(self):
        assert fnd(description="ab").description == "ab"
    def test_desc_short(self):
        with pytest.raises(ValidationError):
            fnd(description="a")
    def test_desc_max(self):
        assert len(fnd(description="d" * 2000).description) == 2000
    def test_desc_over(self):
        with pytest.raises(ValidationError):
            fnd(description="d" * 2001)
    def test_no_insp_id(self):
        with pytest.raises(ValidationError):
            InspectionFindingCreate(finding_type="x", severity="y", description="ab", status="z")
    def test_bad_insp_id(self):
        with pytest.raises(ValidationError):
            fnd(inspection_id="bad")
    @pytest.mark.parametrize("x", XSS[:3])
    def test_desc_xss(self, x):
        chk(fnd(description=f"F {x} here").description)
    @pytest.mark.parametrize("x", XSS[:2])
    def test_type_xss(self, x):
        chk(fnd(finding_type=f"t{x}").finding_type)
    def test_extra(self):
        assert not hasattr(fnd(z="no"), "z")


class TestConsultantTypeCreate:
    def test_valid(self):
        assert cns().name == "Structural Engineer"
    @pytest.mark.parametrize("f", ["name", "name_he", "category"])
    def test_short(self, f):
        with pytest.raises(ValidationError):
            cns(**{f: "x"})
    @pytest.mark.parametrize("f", ["name", "name_he", "category"])
    def test_long(self, f):
        with pytest.raises(ValidationError):
            cns(**{f: "x" * 256})
    @pytest.mark.parametrize("f", ["name", "name_he", "category"])
    def test_min(self, f):
        assert getattr(cns(**{f: "ab"}), f) == "ab"
    @pytest.mark.parametrize("f", ["name", "name_he", "category"])
    def test_max(self, f):
        assert len(getattr(cns(**{f: "x" * 255}), f)) == 255
    @pytest.mark.parametrize("f", ["name", "name_he", "category"])
    def test_missing(self, f):
        d = dict(name="AA", name_he="BB", category="CC")
        del d[f]
        with pytest.raises(ValidationError):
            ConsultantTypeCreate(**d)
    @pytest.mark.parametrize("x", XSS[:3])
    def test_name_xss(self, x):
        chk(cns(name=f"E {x} t").name)
    @pytest.mark.parametrize("x", XSS[:2])
    def test_cat_xss(self, x):
        chk(cns(category=f"C {x}").category)
    def test_extra(self):
        assert not hasattr(cns(z="g"), "z")
    def test_strip(self):
        assert cns(name="  Engineer  ").name == "Engineer"
    def test_hebrew(self):
        assert cns(name_he="מהנדס חשמל בכיר").name_he == "מהנדס חשמל בכיר"
    def test_unicode(self):
        assert cns(category="Ingenieria").category == "Ingenieria"
