import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

type Cell = string | number;

export async function shareCsv(filename: string, headers: string[], rows: Cell[][]) {
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: filename });
  }
}

export async function sharePdf(filename: string, title: string, headers: string[], rows: Cell[][]) {
  const html = `
    <html>
      <body style="font-family: -apple-system, Helvetica, sans-serif; padding: 16px;">
        <h2 style="color:#18181b;">${title}</h2>
        <table style="width:100%; border-collapse: collapse;">
          <tr>
            ${headers
              .map(
                (h) =>
                  `<th style="border-bottom:2px solid #2563eb; text-align:left; padding:6px; font-size:12px; color:#555;">${h}</th>`
              )
              .join('')}
          </tr>
          ${rows
            .map(
              (row) =>
                `<tr>${row
                  .map((c) => `<td style="border-bottom:1px solid #eee; padding:6px; font-size:12px;">${c}</td>`)
                  .join('')}</tr>`
            )
            .join('')}
        </table>
      </body>
    </html>
  `;
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: filename });
  }
}
