/*
2 |---
1 |--
0 |
  0123
*/

await decodeFromUrl(
  "https://docs.google.com/document/d/e/2PACX-1vSvM5gDlNvt7npYHhp_XfsJvuntUhq184By5xO_pA4b_gCWeXb6dM6ZxwN8rE6S4ghUsCj2VKR21oEP/pub",
);

interface RowRecord {
  yCoordinate: number;
  xCoordinate: number;
  character: string;
}

async function decodeFromUrl(url: string): Promise<void> {
  const tableText = await getTableText(url);
  const rows = tableText.split("</tr>");

  const rowRecords: RowRecord[] = [];
  for (const row of rows) {
    if (row.indexOf("<td") > -1) {
      const attemptedColumns = getRowColumns(row);

      if (
        isNaN(attemptedColumns.xCoordinate) ||
        isNaN(attemptedColumns.yCoordinate)
      ) {
        continue;
      }
      rowRecords.push(attemptedColumns);
    }
  }

  rowRecords.sort((a, b) => {
    if (a.yCoordinate !== b.yCoordinate) {
      return b.yCoordinate - a.yCoordinate;
    }
    return a.xCoordinate - b.xCoordinate;
  });

  const lines: string[] = [];
  let yCurrent = rowRecords[0].yCoordinate;
  let currentLine = "";
  for (const record of rowRecords) {
    if (record.yCoordinate !== yCurrent) {
      yCurrent = record.yCoordinate;
      lines.push(currentLine);
      currentLine = "";
    }
    while (record.xCoordinate > currentLine.length) {
      currentLine += " ";
    }
    currentLine += record.character;
  }
  lines.push(currentLine);

  console.log(lines.join("\n"));
}

async function getTableText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${url}: ${response.statusText}`);
  }

  const documentText = await response.text();
  const table = documentText.indexOf("<table");
  if (table === -1) {
    throw new Error("Failed to find <table> in response text");
  }
  const endTable = documentText.indexOf("</table>", table);
  if (endTable === -1) {
    throw new Error("Failed to find </table> in response text");
  }
  const tableText = documentText.substring(table, endTable + "</table>".length);
  return tableText;
}

function getRowColumns(row: string): RowRecord {
  const columns = row.split("</td>");
  //ignoring any tests for sake of consistency and brevity
  return {
    yCoordinate: parseInt(removeHTMLTags(columns[2])),
    xCoordinate: parseInt(removeHTMLTags(columns[0])),
    character: removeHTMLTags(columns[1]) ?? " ",
  };
}

function removeHTMLTags(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

export {};
