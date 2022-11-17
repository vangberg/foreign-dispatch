import "./style.css";
import initSqlJs from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import dbUrl from "./en-de.sqlite3?url";
import { EditorView, basicSetup } from "codemirror";
import { autocompletion } from "@codemirror/autocomplete";

async function main() {
  const sqlPromise = await initSqlJs({
    locateFile: (_) => sqlWasmUrl,
  });

  const dataPromise = fetch(dbUrl).then((res) => res.arrayBuffer());

  const [SQL, buf] = await Promise.all([sqlPromise, dataPromise]);
  const db = new SQL.Database(new Uint8Array(buf));

  function lookup(term) {
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
    stmt.bind({ ":term": `${term.slice(1)}*` });
    const results = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const translations = row.trans_list.split(" | ");
      translations.forEach((translation) => {
        results.push({
          label: `@${row.written_rep}`,
          type: "text",
          detail: translation,
          apply: translation,
          info: row.sense_list,
        });
      });
    }
    return results;
  }

  function completions(context) {
    let word = context.matchBefore(/@\w+/);
    if (!word || (word.from == word.to && !context.explicit)) return null;
    return {
      from: word.from,
      options: lookup(word.text),
    };
  }

  let editor = new EditorView({
    extensions: [
      basicSetup,
      autocompletion({ override: [completions], activateOnTyping: true }),
    ],
    parent: document.getElementById("editor"),
  });
}

main();
