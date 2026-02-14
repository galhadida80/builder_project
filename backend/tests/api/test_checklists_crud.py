import uuid

import pytest

from app.models.project import Project, ProjectMember

A, F = "/api/v1", str(uuid.uuid4())
def tu(p): return f"{A}/projects/{p}/checklist-templates"
def td(p, t): return f"{A}/projects/{p}/checklist-templates/{t}"
def su(t): return f"{A}/checklist-templates/{t}/subsections"
def sd(t, s): return f"{A}/checklist-templates/{t}/subsections/{s}"
def iu(s): return f"{A}/subsections/{s}/items"
def id_(s, i): return f"{A}/subsections/{s}/items/{i}"
def nu(p): return f"{A}/projects/{p}/checklist-instances"
def nd(p, i): return f"{A}/projects/{p}/checklist-instances/{i}"
def ru(i): return f"{A}/checklist-instances/{i}/responses"
def rd(i, r): return f"{A}/checklist-instances/{i}/responses/{r}"
def tp(**o): return {**{"name":"Safety","level":"project","group":"safety","category":"gen"},**o}
def sp(**o): return {**{"name":"Sec A","order":0},**o}
def ip(**o): return {**{"name":"Check item","must_image":False,"must_note":False,"must_signature":False},**o}
def np(t,**o): return {**{"template_id":str(t),"unit_identifier":"U-A1","status":"pending"},**o}
def rp(i,**o): return {**{"item_template_id":str(i),"status":"approved","notes":"OK"},**o}

async def mt(c,p,**o): r=await c.post(tu(str(p)),json=tp(**o)); assert r.status_code==200,r.text; return r.json()
async def ms(c,t,**o): r=await c.post(su(str(t)),json=sp(**o)); assert r.status_code==200,r.text; return r.json()
async def mi(c,s,**o): r=await c.post(iu(str(s)),json=ip(**o)); assert r.status_code==201,r.text; return r.json()
async def mn(c,p,t,**o): r=await c.post(nu(str(p)),json=np(t,**o)); assert r.status_code==201,r.text; return r.json()
async def mr(c,n,i,**o): r=await c.post(ru(str(n)),json=rp(i,**o)); assert r.status_code==201,r.text; return r.json()
async def ch(c,p):
    t=await mt(c,p);s=await ms(c,t["id"]);i=await mi(c,s["id"]);n=await mn(c,p,t["id"]);return t,s,i,n
async def mp(db,u):
    p=Project(id=uuid.uuid4(),name="O",code=f"O-{uuid.uuid4().hex[:4]}",status="active",created_by_id=u.id)
    db.add(p);await db.flush();db.add(ProjectMember(project_id=p.id,user_id=u.id,role="project_admin"));await db.commit();await db.refresh(p);return p


class TestTemplate:
    @pytest.mark.asyncio
    async def test_create(self, admin_client, project):
        d=await mt(admin_client,project.id)
        for f in ["id","name","level","group","created_at","updated_at"]: assert f in d
        assert d["subsections"]==[]
    @pytest.mark.asyncio
    async def test_values(self, admin_client, project):
        d=await mt(admin_client,project.id,level="eq",group="q",category=None,metadata={"v":2})
        assert d["level"]=="eq" and d["group"]=="q" and d["category"] is None and d["metadata"]["v"]==2
    @pytest.mark.asyncio
    async def test_ids_unique(self, admin_client, project):
        assert (await mt(admin_client,project.id,name="AA"))["id"]!=(await mt(admin_client,project.id,name="BB"))["id"]
    @pytest.mark.asyncio
    async def test_boundary(self, admin_client, project):
        assert (await mt(admin_client,project.id,name="AB"))["name"]=="AB"
        assert len((await mt(admin_client,project.id,name="N"*255))["name"])==255
    @pytest.mark.asyncio
    @pytest.mark.parametrize("f,v",[("name","A"),("name",""),("name","N"*256),("name",None)])
    async def test_invalid(self, admin_client, project, f, v):
        assert (await admin_client.post(tu(str(project.id)),json=tp(**{f:v}))).status_code==422
    @pytest.mark.asyncio
    @pytest.mark.parametrize("m",["name","level","group"])
    async def test_missing(self, admin_client, project, m):
        p=tp();del p[m];assert (await admin_client.post(tu(str(project.id)),json=p)).status_code==422
    @pytest.mark.asyncio
    async def test_list_empty_and_count(self, admin_client, project):
        assert (await admin_client.get(tu(str(project.id)))).json()==[]
        for i in range(3): await mt(admin_client,project.id,name=f"T{i}")
        assert len((await admin_client.get(tu(str(project.id)))).json())==3
    @pytest.mark.asyncio
    async def test_global_list(self, admin_client):
        assert (await admin_client.get(f"{A}/checklist-templates")).status_code==200
    @pytest.mark.asyncio
    async def test_isolation(self, admin_client, project, db, admin_user):
        await mt(admin_client,project.id,name="XX");o=await mp(db,admin_user);await mt(admin_client,o.id,name="YY")
        n=[t["name"] for t in (await admin_client.get(tu(str(project.id)))).json()]
        assert "XX" in n and "YY" not in n
    @pytest.mark.asyncio
    async def test_get_and_404(self, admin_client, project):
        t=await mt(admin_client,project.id)
        r=await admin_client.get(td(str(project.id),t["id"]))
        assert r.status_code==200
        assert (await admin_client.get(td(str(project.id),F))).status_code==404
    @pytest.mark.asyncio
    async def test_update(self, admin_client, project):
        t=await mt(admin_client,project.id)
        r=await admin_client.put(td(str(project.id),t["id"]),json={"name":"UU"})
        assert r.status_code==200 and r.json()["name"]=="UU" and r.json()["level"]==t["level"]
    @pytest.mark.asyncio
    async def test_update_404(self, admin_client, project):
        assert (await admin_client.put(td(str(project.id),F),json={"name":"GG"})).status_code==404
    @pytest.mark.asyncio
    async def test_delete(self, admin_client, project):
        t=await mt(admin_client,project.id)
        assert (await admin_client.delete(td(str(project.id),t["id"]))).status_code==200
        assert (await admin_client.get(td(str(project.id),t["id"]))).status_code==404
    @pytest.mark.asyncio
    async def test_delete_404_and_double(self, admin_client, project):
        assert (await admin_client.delete(td(str(project.id),F))).status_code==404
        t=await mt(admin_client,project.id);await admin_client.delete(td(str(project.id),t["id"]))
        assert (await admin_client.delete(td(str(project.id),t["id"]))).status_code==404
    @pytest.mark.asyncio
    async def test_delete_keeps_others(self, admin_client, project):
        a=await mt(admin_client,project.id,name="Keep");b=await mt(admin_client,project.id,name="Rm")
        await admin_client.delete(td(str(project.id),b["id"]))
        r=(await admin_client.get(tu(str(project.id)))).json()
        assert len(r)==1 and r[0]["name"]=="Keep"


class TestSubsection:
    @pytest.mark.asyncio
    async def test_crud(self, admin_client, project):
        t=await mt(admin_client,project.id);d=await ms(admin_client,t["id"])
        assert d["name"]=="Sec A" and d["order"]==0 and d["items"]==[]
        assert (await admin_client.get(sd(t["id"],d["id"]))).status_code==200
        assert (await admin_client.put(sd(t["id"],d["id"]),json={"name":"UU"})).json()["name"]=="UU"
        assert (await admin_client.delete(sd(t["id"],d["id"]))).status_code==200
    @pytest.mark.asyncio
    async def test_list_and_order(self, admin_client, project):
        t=await mt(admin_client,project.id)
        await ms(admin_client,t["id"],name="BB",order=1);await ms(admin_client,t["id"],name="AA",order=0)
        r=(await admin_client.get(su(t["id"]))).json()
        assert len(r)==2 and [s["name"] for s in r]==["AA","BB"]
    @pytest.mark.asyncio
    async def test_bad_tpl_and_del404(self, admin_client, project):
        assert (await admin_client.post(su(F),json=sp())).status_code==404
        t=await mt(admin_client,project.id)
        assert (await admin_client.delete(sd(t["id"],F))).status_code==404
    @pytest.mark.asyncio
    async def test_meta(self, admin_client, project):
        t=await mt(admin_client,project.id);assert (await ms(admin_client,t["id"],metadata={"p":"h"}))["metadata"]["p"]=="h"
    @pytest.mark.asyncio
    @pytest.mark.parametrize("f,v",[("name",""),("name","N"*256),("name",None),("order",-1)])
    async def test_invalid(self, admin_client, project, f, v):
        t=await mt(admin_client,project.id)
        assert (await admin_client.post(su(t["id"]),json=sp(**{f:v}))).status_code==422
    @pytest.mark.asyncio
    @pytest.mark.parametrize("m",["name","order"])
    async def test_miss(self, admin_client, project, m):
        t=await mt(admin_client,project.id);p=sp();del p[m]
        assert (await admin_client.post(su(t["id"]),json=p)).status_code==422


class TestItem:
    @pytest.mark.asyncio
    async def test_crud(self, admin_client, project):
        t=await mt(admin_client,project.id);s=await ms(admin_client,t["id"]);d=await mi(admin_client,s["id"])
        assert not d["must_image"] and not d["must_note"] and not d["must_signature"]
        assert (await admin_client.get(id_(s["id"],d["id"]))).status_code==200
        assert (await admin_client.put(id_(s["id"],d["id"]),json={"name":"UU"})).json()["name"]=="UU"
        assert (await admin_client.delete(id_(s["id"],d["id"]))).status_code==200
    @pytest.mark.asyncio
    async def test_list_and_flags(self, admin_client, project):
        t=await mt(admin_client,project.id);s=await ms(admin_client,t["id"])
        await mi(admin_client,s["id"],name="I1");await mi(admin_client,s["id"],name="I2")
        assert len((await admin_client.get(iu(s["id"]))).json())==2
        d=await mi(admin_client,s["id"],must_image=True,must_note=True,must_signature=True)
        assert d["must_image"] and d["must_note"] and d["must_signature"]
    @pytest.mark.asyncio
    async def test_cat_desc(self, admin_client, project):
        t=await mt(admin_client,project.id);s=await ms(admin_client,t["id"])
        d=await mi(admin_client,s["id"],category="st",description="cb")
        assert d["category"]=="st" and d["description"]=="cb"
    @pytest.mark.asyncio
    async def test_bad_sub_and_del404(self, admin_client, project):
        assert (await admin_client.post(iu(F),json=ip())).status_code==404
        t=await mt(admin_client,project.id);s=await ms(admin_client,t["id"])
        assert (await admin_client.delete(id_(s["id"],F))).status_code==404
    @pytest.mark.asyncio
    @pytest.mark.parametrize("f,v",[("name",""),("name","N"*256),("name",None)])
    async def test_invalid(self, admin_client, project, f, v):
        t=await mt(admin_client,project.id);s=await ms(admin_client,t["id"])
        assert (await admin_client.post(iu(s["id"]),json=ip(**{f:v}))).status_code==422
    @pytest.mark.asyncio
    async def test_miss(self, admin_client, project):
        t=await mt(admin_client,project.id);s=await ms(admin_client,t["id"])
        assert (await admin_client.post(iu(s["id"]),json={"must_image":True})).status_code==422


class TestInstance:
    @pytest.mark.asyncio
    async def test_crud(self, admin_client, project):
        t=await mt(admin_client,project.id);d=await mn(admin_client,project.id,t["id"])
        assert d["unit_identifier"]=="U-A1" and d["status"]=="pending" and d["responses"]==[]
        assert (await admin_client.get(nd(str(project.id),d["id"]))).status_code==200
        r=await admin_client.put(nd(str(project.id),d["id"]),json={"status":"in_progress"})
        assert r.status_code==200 and r.json()["status"]=="in_progress"
        assert (await admin_client.delete(nd(str(project.id),d["id"]))).status_code==200
    @pytest.mark.asyncio
    async def test_list_and_multi(self, admin_client, project):
        assert (await admin_client.get(nu(str(project.id)))).json()==[]
        t=await mt(admin_client,project.id)
        for i in range(3): await mn(admin_client,project.id,t["id"],unit_identifier=f"U{i}")
        assert len((await admin_client.get(nu(str(project.id)))).json())==3
    @pytest.mark.asyncio
    async def test_404s(self, admin_client, project):
        assert (await admin_client.get(nd(str(project.id),F))).status_code==404
        assert (await admin_client.delete(nd(str(project.id),F))).status_code==404
    @pytest.mark.asyncio
    async def test_meta_and_global(self, admin_client, project):
        t=await mt(admin_client,project.id)
        assert (await mn(admin_client,project.id,t["id"],metadata={"f":3}))["metadata"]["f"]==3
        assert (await admin_client.get(f"{A}/checklist-instances")).status_code==200
    @pytest.mark.asyncio
    @pytest.mark.parametrize("f,v",[("unit_identifier",""),("unit_identifier",None)])
    async def test_invalid(self, admin_client, project, f, v):
        t=await mt(admin_client,project.id)
        assert (await admin_client.post(nu(str(project.id)),json=np(t["id"],**{f:v}))).status_code==422
    @pytest.mark.asyncio
    @pytest.mark.parametrize("m",["template_id","unit_identifier"])
    async def test_miss(self, admin_client, project, m):
        t=await mt(admin_client,project.id);p=np(t["id"]);del p[m]
        assert (await admin_client.post(nu(str(project.id)),json=p)).status_code==422


class TestResponse:
    @pytest.mark.asyncio
    async def test_crud(self, admin_client, project):
        t,s,i,n=await ch(admin_client,project.id);d=await mr(admin_client,n["id"],i["id"])
        assert d["status"]=="approved" and d["notes"]=="OK"
        assert (await admin_client.get(rd(n["id"],d["id"]))).status_code==200
        r=await admin_client.put(rd(n["id"],d["id"]),json={"status":"rejected"})
        assert r.status_code==200 and r.json()["status"]=="rejected"
        assert (await admin_client.delete(rd(n["id"],d["id"]))).status_code==200
    @pytest.mark.asyncio
    async def test_list(self, admin_client, project):
        t,s,i,n=await ch(admin_client,project.id);await mr(admin_client,n["id"],i["id"])
        assert len((await admin_client.get(ru(n["id"]))).json())==1
    @pytest.mark.asyncio
    async def test_bad_inst_and_del404(self, admin_client, project):
        t=await mt(admin_client,project.id);s=await ms(admin_client,t["id"]);i=await mi(admin_client,s["id"])
        assert (await admin_client.post(ru(F),json=rp(i["id"]))).status_code==404
        n=await mn(admin_client,project.id,t["id"]);assert (await admin_client.delete(rd(n["id"],F))).status_code==404
    @pytest.mark.asyncio
    async def test_imgs_and_sig(self, admin_client, project):
        t,s,i,n=await ch(admin_client,project.id)
        d=await mr(admin_client,n["id"],i["id"],image_urls=["u1"])
        assert len(d["image_urls"])==1
        i2=await mi(admin_client,s["id"],name="C2")
        d2=await mr(admin_client,n["id"],i2["id"],signature_url="s.png")
        assert d2["signature_url"]=="s.png"


class TestAuth:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("m,uf",[
        ("POST",lambda p:tu(str(p.id))),("GET",lambda p:tu(str(p.id))),("GET",lambda p:td(str(p.id),F)),
        ("PUT",lambda p:td(str(p.id),F)),("DELETE",lambda p:td(str(p.id),F)),
        ("POST",lambda p:nu(str(p.id))),("GET",lambda p:nu(str(p.id))),("GET",lambda p:nd(str(p.id),F)),
        ("DELETE",lambda p:nd(str(p.id),F)),
    ])
    async def test_401(self, client, project, m, uf):
        u=uf(project)
        r=await(client.post(u,json=tp()) if m=="POST" else client.delete(u) if m=="DELETE" else client.put(u,json={"name":"X"}) if m=="PUT" else client.get(u))
        assert r.status_code==401
    @pytest.mark.asyncio
    async def test_no_member(self, user_client, project):
        assert (await user_client.post(tu(str(project.id)),json=tp())).status_code==403
        assert (await user_client.get(tu(str(project.id)))).status_code==403
    @pytest.mark.asyncio
    async def test_member_ok(self, user_client, project, db, regular_user):
        db.add(ProjectMember(project_id=project.id,user_id=regular_user.id,role="contractor"));await db.commit()
        r=await user_client.post(tu(str(project.id)),json=tp())
        assert r.status_code==200
        assert (await user_client.get(tu(str(project.id)))).status_code==200
    @pytest.mark.asyncio
    async def test_fake_proj(self, admin_client):
        assert (await admin_client.post(tu(F),json=tp())).status_code==403


class TestLifecycle:
    @pytest.mark.asyncio
    async def test_full(self, admin_client, project):
        t,s,i,n=await ch(admin_client,project.id);await mr(admin_client,n["id"],i["id"])
        assert len((await admin_client.get(ru(n["id"]))).json())==1
    @pytest.mark.asyncio
    async def test_nested(self, admin_client, project):
        t=await mt(admin_client,project.id);s=await ms(admin_client,t["id"]);await mi(admin_client,s["id"])
        r=(await admin_client.get(su(t["id"]))).json()
        assert len(r)==1 and len(r[0]["items"])==1
    @pytest.mark.asyncio
    async def test_update_verify(self, admin_client, project):
        t=await mt(admin_client,project.id)
        await admin_client.put(td(str(project.id),t["id"]),json={"name":"RR"})
        assert (await admin_client.get(td(str(project.id),t["id"]))).json()["name"]=="RR"


class TestEdge:
    @pytest.mark.asyncio
    async def test_extra_fields_ignored(self, admin_client, project):
        p=tp();p["x"]=1;assert (await admin_client.post(tu(str(project.id)),json=p)).status_code==200
    @pytest.mark.asyncio
    async def test_empty_body(self, admin_client, project):
        assert (await admin_client.post(tu(str(project.id)),content=b"",headers={"Content-Type":"application/json"})).status_code==422
    @pytest.mark.asyncio
    async def test_dup_names(self, admin_client, project):
        await mt(admin_client,project.id,name="DD");assert (await mt(admin_client,project.id,name="DD"))["name"]=="DD"
    @pytest.mark.asyncio
    async def test_update_invalid_name(self, admin_client, project):
        t=await mt(admin_client,project.id)
        assert (await admin_client.put(td(str(project.id),t["id"]),json={"name":"N"*256})).status_code==422
