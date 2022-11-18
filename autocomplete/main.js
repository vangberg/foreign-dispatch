import "./style.css";
import initSqlJs from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { EditorView, basicSetup } from "codemirror";
import { autocompletion } from "@codemirror/autocomplete";

async function main() {
  const sqlPromise = await initSqlJs({
    locateFile: () => sqlWasmUrl,
  });

  const dataPromise = fetch(
    "https://download.wikdict.com/dictionaries/wdweb/en-de.sqlite3"
  ).then((res) => res.arrayBuffer());

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
    stmt.bind({ ":term": `${term}*` });
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

  "foo".char;

  function completions(context) {
    let match = context.matchBefore(/@\w+/);
    if (!match) return null;

    let word = match.text.slice(1);

    console.log(lookup(word));
    return {
      from: match.from,
      options: lookup(word),
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
