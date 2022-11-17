import "./style.css";
import initSqlJs from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import dbUrl from "./en-de.sqlite3?url";
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";

async function main() {
  const sqlPromise = await initSqlJs({
    locateFile: (_) => sqlWasmUrl,
  });

  const dataPromise = fetch(dbUrl).then((res) => res.arrayBuffer());

  const [SQL, buf] = await Promise.all([sqlPromise, dataPromise]);
  const db = new SQL.Database(new Uint8Array(buf));

  const stmt = db.prepare(`
  SELECT written_rep, trans_list, sense_list
  FROM (
      SELECT DISTINCT written_rep
      FROM search_trans
      WHERE form MATCH :term
    )
    JOIN translation USING (written_rep)
    ORDER BY
      lower(written_rep) LIKE '%'|| lower(:term) ||'%' DESC, length(written_rep),
      lexentry, coalesce(min_sense_num, '99'), importance * translation_score DESC
    LIMIT 5
  `);
  stmt.bind({ ":term": "hello" });
  while (stmt.step()) {
    const row = stmt.getAsObject();
    console.log(row);
  }

  let editor = new EditorView({
    extensions: [basicSetup, javascript()],
    parent: document.body,
  });
}

main();
