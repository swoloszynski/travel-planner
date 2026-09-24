// Deciding how to bring this browser's data and the file on disk into line.
//
// Each side is the JSON text of the whole state. `lastWritten` is the text
// this browser last wrote to the file (or read from it), or null if it never
// has. Comparing against it tells "the file changed elsewhere" apart from
// "this browser changed", which comparing the two sides alone can't.
//
//   no file                       write it
//   same on both sides            nothing to do
//   only this browser changed     write it
//   only the file changed         load it
//   both changed                  load the file, and keep this browser's
//                                 version as a backup beside it
export function planSync({ local, file, lastWritten }) {
  if (file === null) return "write";
  if (file === local) return "none";
  if (file === lastWritten) return "write";
  if (local === lastWritten) return "load";
  return "load and back up";
}
