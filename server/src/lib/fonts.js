// Standard Word/document font list (§3). Kept in sync manually with
// src/app/lib/fonts.js on the frontend — small and static enough that a
// shared package isn't worth the cross-workspace deployment risk on
// HostKing (see server/README notes on why server/ isn't a pnpm workspace
// member).
const FONTS = [
  "Arial",
  "Calibri",
  "Cambria",
  "Century Gothic",
  "Comic Sans MS",
  "Courier New",
  "Garamond",
  "Georgia",
  "Helvetica",
  "Impact",
  "Lucida Sans",
  "Palatino Linotype",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
];

module.exports = { FONTS };
