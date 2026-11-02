# User guide

## Add a resume

Use **Upload Resume** to import a PDF or DOCX. The app keeps the original file
and extracted text on your computer. An image-only or scanned PDF may not have
extractable text; compare the draft with the original and fill in missing
details.

## Build a resume

Open **Resume Builder**, select an uploaded resume, and review each section.
Parsing is an editable first draft, not a verified copy. Check contact details,
employment dates, skills, projects, and education. Sections with long lists
scroll within the review workspace. Preview the result, then use the browser
print dialog to print or save a PDF.

## Configure a model

Open **Settings** and choose a provider. Enter your own provider API key where
required, save it, and select a model. Keys are stored in the operating
system's credential manager rather than in the resume database.

For Ollama, install Ollama and download a model yourself. Set the Ollama
endpoint and model in Settings. The local API still runs on your computer; the
Ollama model service is a separate process.

## Cover letters and job tracking

Use **Cover Letter** to generate a draft from a selected resume and job
description. Review and edit the result before using it. Use **Job Tracker** to
record applications and update their status.

## ATS analysis

ATS scan, tailoring, scan history, analytics, and resume versions are controlled
by `ATS_SCAN_ENABLED` on the local backend. It is off by default. To enable it
for development, start the backend with `ATS_SCAN_ENABLED=true`. Packaged
desktop builds inherit environment variables from the process that launches
the app.

## Personal data

Resume files and application data are sensitive. They are stored under
`~/ATSCheck`; keep the computer and backups protected. If you select a cloud
provider, the text needed for that operation is transmitted to the provider.
