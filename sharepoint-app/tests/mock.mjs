/* Nagebootste SharePoint voor de tests: houdt lijsten, kolommen en items in het geheugen
   en beantwoordt de REST-aanroepen die de app doet, via page.route. */
import fs from "node:fs";

export const ASPX = fs.readFileSync("/workspace/stockbeheer-uitleendienst/sharepoint-app/Uitleendienst-app.aspx", "utf8");
export const BASIS = "https://mock.sharepoint.com/sites/test";
export const PAGINA = BASIS + "/Siteactiva/Uitleendienst-app.aspx";

export function maakMock(opties = {}) {
  const st = {
    magAanmaken: opties.magAanmaken !== false,
    lijsten: {},            // naam -> { velden:Set, items:[], teller:0 }
    tellers: { lijstAanmaak: 0, veldAanmaak: 0, itemPost: 0, merge: 0, del: 0 },
    gebruiker: opties.gebruiker || { Title: "Els Peeters", Email: "els.peeters@londerzeel.be" },
  };
  st.maakLijst = (naam, velden = []) => {
    st.lijsten[naam] = { velden: new Set(["Title", "Id", ...velden]), items: [], teller: 0 };
  };

  const json = (route, body, status = 200) =>
    route.fulfill({ status, contentType: "application/json;odata=nometadata", body: JSON.stringify(body) });

  st.afhandelaar = async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pad = decodeURIComponent(url.pathname);
    const methode = req.method();
    const xm = req.headers()["x-http-method"] || "";

    if (pad.endsWith("/Uitleendienst-app.aspx")) {
      return route.fulfill({ status: 200, contentType: "text/html", body: ASPX });
    }
    if (pad.endsWith("/_api/contextinfo")) {
      if (!pad.startsWith("/sites/test/_api")) return json(route, { error: "geen web" }, 404);
      return json(route, { WebFullUrl: BASIS, FormDigestValue: "digest-" + Date.now() });
    }
    if (pad.endsWith("/_api/web/currentuser")) return json(route, st.gebruiker);

    const lijstMatch = pad.match(/getbytitle\('([^']+)'\)(.*)$/);
    if (pad.endsWith("/_api/web/lists") && methode === "POST") {
      st.tellers.lijstAanmaak++;
      if (!st.magAanmaken) return json(route, { error: "Access denied" }, 403);
      const body = req.postDataJSON();
      st.maakLijst(body.Title);
      return json(route, { Title: body.Title });
    }
    if (!lijstMatch) return json(route, { error: "onbekend pad " + pad }, 404);

    const naam = lijstMatch[1], rest = lijstMatch[2];
    const lijst = st.lijsten[naam];
    if (!lijst) return json(route, { error: "lijst bestaat niet" }, 404);

    if (rest.startsWith("/fields/createfieldasxml")) {
      st.tellers.veldAanmaak++;
      if (!st.magAanmaken) return json(route, { error: "Access denied" }, 403);
      const veld = req.postDataJSON().parameters.SchemaXml.match(/Name="([^"]+)"/)[1];
      lijst.velden.add(veld);
      return json(route, {});
    }
    if (rest.startsWith("/fields/getbyinternalnameortitle")) return route.fulfill({ status: 204, body: "" });
    if (rest.startsWith("/defaultview/viewfields/addviewfield")) return route.fulfill({ status: 204, body: "" });
    if (rest.startsWith("/fields")) return json(route, { value: [...lijst.velden].map((f) => ({ InternalName: f })) });
    if (rest === "" || rest === "?") {
      if (url.search.includes("ListItemEntityTypeFullName")) return json(route, { ListItemEntityTypeFullName: `SP.Data.${naam}ListItem` });
      return json(route, { Title: naam });
    }
    const itemMatch = rest.match(/^\/items\((\d+)\)/);
    if (itemMatch) {
      const id = +itemMatch[1];
      const item = lijst.items.find((i) => i.Id === id);
      if (!item) return json(route, { error: "item bestaat niet" }, 404);
      if (xm === "MERGE") { st.tellers.merge++; Object.assign(item, zeef(req.postDataJSON())); return route.fulfill({ status: 204, body: "" }); }
      if (xm === "DELETE") { st.tellers.del++; lijst.items = lijst.items.filter((i) => i.Id !== id); return route.fulfill({ status: 204, body: "" }); }
      return json(route, item);
    }
    if (rest.startsWith("/items")) {
      if (methode === "POST") {
        st.tellers.itemPost++;
        const body = zeef(req.postDataJSON());
        for (const k of Object.keys(body)) {
          if (!lijst.velden.has(k)) return json(route, { error: `kolom ${k} bestaat niet` }, 400);
        }
        const item = Object.assign({ Id: ++lijst.teller }, body);
        lijst.items.push(item);
        return json(route, item);
      }
      const sel = (url.searchParams.get("$select") || "").split(",").filter(Boolean);
      for (const k of sel) if (k && !lijst.velden.has(k)) return json(route, { error: `kolom ${k} bestaat niet in $select` }, 400);
      return json(route, { value: lijst.items.map((i) => Object.assign({}, i)) });
    }
    return json(route, { error: "onbekend " + rest }, 404);
  };
  return st;
}
function zeef(body) { const b = Object.assign({}, body); delete b.__metadata; return b; }
