"""Generic CRUD engine: create/read/update/delete + search, sort, pagination,
and the base_filters/defaults mechanism (Blog vs Actualités over one table)."""
from __future__ import annotations


def test_faq_crud_cycle(admin):
    created = admin.post("/api/faq", json={"question": "Q crud?", "answer": "A."})
    assert created.status_code == 201
    fid = created.get_json()["data"]["id"]

    got = admin.get(f"/api/faq/{fid}")
    assert got.status_code == 200
    assert got.get_json()["data"]["question"] == "Q crud?"

    patched = admin.patch(f"/api/faq/{fid}", json={"question": "Q modifiée?"})
    assert patched.get_json()["data"]["question"] == "Q modifiée?"

    assert admin.delete(f"/api/faq/{fid}").status_code == 200
    # Soft-deleted -> no longer in the active listing.
    listing = admin.get("/api/faq?q=modifiée").get_json()
    assert all(i["id"] != fid for i in listing["items"])


def test_pagination_and_meta(admin):
    for i in range(5):
        admin.post("/api/faq", json={"question": f"Page Q{i}", "answer": "A"})
    resp = admin.get("/api/faq?per_page=2")
    body = resp.get_json()
    assert body["meta"]["per_page"] == 2
    assert len(body["items"]) == 2
    assert body["meta"]["has_next"] is True


def test_search_filters_results(admin):
    admin.post("/api/faq", json={"question": "ZZZUNIQUE marker", "answer": "A"})
    resp = admin.get("/api/faq?q=ZZZUNIQUE")
    items = resp.get_json()["items"]
    assert len(items) >= 1
    assert all("ZZZUNIQUE" in i["question"] for i in items)


def test_blog_and_news_share_table_but_are_scoped(admin):
    b = admin.post("/api/blog", json={"title": "Article de blog"})
    n = admin.post("/api/news", json={"title": "Actu du jour"})
    assert b.status_code == 201 and n.status_code == 201

    blog_titles = [i["title"] for i in admin.get("/api/blog?per_page=100").get_json()["items"]]
    news_titles = [i["title"] for i in admin.get("/api/news?per_page=100").get_json()["items"]]
    assert "Article de blog" in blog_titles
    assert "Article de blog" not in news_titles
    assert "Actu du jour" in news_titles
    assert "Actu du jour" not in blog_titles
