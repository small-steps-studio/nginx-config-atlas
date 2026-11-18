# Troubleshooting

## The report says the file is not valid

Nginx Config Atlas reads the text of the open file the way nginx reads it: words, quoted strings, comments that start with # at the beginning of a word, and blocks in braces. It reads only the open file; an include directive is listed but the included file is not opened. A file with unbalanced braces or a missing semicolon is still read, and the Syntax Check report lists where the problem is.

## The file is too large

Reports read files up to the size set in `nginxConfigAtlas.maxFileSizeMB` (50 MB by default and at most). VS Code passes files only up to 50 MB to extensions, so a larger file cannot be read by any extension: split it, or save a shorter one.

## The preview does not open

The report always opens as a Markdown document. If the preview stays closed, set `nginxConfigAtlas.openReportsAsPreview` to true and check that the built-in Markdown extension is enabled.

## Pro or the trial does not unlock

Run **Nginx Config Atlas: Show Licence Status**. It tells whether a key is stored, whether it was checked, and how many trial days are left. Details are in [licence.md](licence.md).

## Something else

Run **Nginx Config Atlas: Report A Problem**. It copies a diagnostics block (versions, settings, licence state; no file contents) and opens the issues page.
