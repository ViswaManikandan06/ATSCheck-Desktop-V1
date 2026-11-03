# ATSCheck Desktop user guide

This guide walks through the main job-search workflows and explains what
happens to your information. For downloading the app, see
[Install and get started](SETUP.md).

## At a glance

| You want to… | Start here |
| --- | --- |
| Add a resume to your local library | **Upload Resume** |
| Turn an existing resume into an editable draft | **Resume Builder** |
| Draft a letter for a role | **Cover Letter** |
| Record an application and follow-up | **Job Tracker** |
| Choose an AI provider or model | **Settings** |
| Enable optional analysis tools | [Feature flags](feature-flags.md) |

## 1. Import a resume

1. Open **Upload Resume** and choose a PDF or DOCX file.
2. Wait for extraction to finish, then open the resume from your library.
3. Compare the extracted text with the original document. Fix spelling,
   contact information, dates, employer names, and section order before using
   it in another workflow.

ATSCheck retains the original upload and stores the extracted resume data
locally. A PDF with selectable text usually extracts better than a scanned
image. OCR is not bundled, so scanned pages may need manual correction.

## 2. Review and build a resume

1. Open **Resume Builder** and select the resume you want to use.
2. Review the parsed content and confirm each section against the source.
3. Edit, add, remove, and reorder sections to match the draft you want.
4. Check skills, employment dates, accomplishments, education, and contact
   details especially carefully; parsing is a starting point, not validation.
5. Preview the page layout. Use the print action and choose **Save as PDF** in
   your system's print dialog when you want a PDF copy.

Long section lists are contained within the builder workspace. Scroll within
the section list/editor to review them; the page should not grow indefinitely
as content is added.

## 3. Configure a model

AI-assisted features require a compatible provider and model. Open **Settings**
to choose a provider and configure its credentials:

1. Select the provider you intend to use.
2. Add your API key if that provider requires one, then save it.
3. Select a model and endpoint supported by that provider.
4. Test with non-sensitive sample text before sending personal information.

Supported integrations include OpenAI, Anthropic, Gemini, Groq, Mistral, and
Ollama. Provider features, model names, cost, rate limits, and data practices
are set by those services and may change.

Keys are saved in the operating system credential store. ATSCheck does not
issue, purchase, or manage provider accounts or API usage.

### Use Ollama

Ollama runs separately from ATSCheck:

1. Install Ollama and download a model that fits your hardware.
2. Start the Ollama service.
3. In ATSCheck **Settings**, select Ollama and set the service endpoint and
   installed model.
4. Verify the connection before using an AI workflow.

Ollama can keep inference local to your computer, but you still need to
install and maintain the Ollama service and model yourself.

## 4. Draft a cover letter

1. Open **Cover Letter** and choose the resume that provides the relevant
   background.
2. Enter or paste the job description and any role-specific context you want
   the draft to consider.
3. Generate the draft using your configured provider.
4. Edit the result. Check that every qualification, project, date, and claim
   is true before sending it.

If you use a cloud provider, the resume and job-description content needed for
the request is sent to that provider. Do not send information you are not
comfortable sharing with it.

## 5. Track an application

1. Open **Job Tracker** and create an entry for the role.
2. Record the company, position, application date, and any useful notes.
3. Update the status as the process moves forward.
4. Add follow-up details so the next action is easy to find.

Use the tracker as a personal record. Keep notes professional and avoid
entering unnecessary sensitive information.

## 6. Optional ATS analysis and related tools

ATS analysis, tailoring, scan history, analytics, and resume versions are
controlled by `ATS_SCAN_ENABLED` and are **off by default**. They are enabled
or disabled together through the backend environment; there is not currently
an in-app switch. Read [Feature flags](feature-flags.md) for precise
instructions, including launching the packaged app with an environment value.

An ATS result is an aid for reviewing a document, not a guarantee of
compatibility, ranking, or an interview. Review recommendations critically and
make sure any edits remain accurate and readable.

## Where your information goes

| Information | Normal storage or handling |
| --- | --- |
| Resume files | `~/ATSCheck/resumes` on your computer |
| Application database | `~/ATSCheck/atscheck.db` on your computer |
| Provider API keys | Operating system credential store |
| Cloud AI request content | Sent to the selected provider for the requested operation |
| Local API | Listens on `127.0.0.1:8000` in the packaged app |

Protect your computer and backups. Close ATSCheck before backing up its data
folder. See [Security and privacy](../SECURITY.md) for more detail.

## Common questions

### Can I use the app without an API key?

Yes. Local resume storage and workflows that do not call a model can be used
without configuring a cloud provider. AI-generated features need a working
provider or configured local model.

### Why is my PDF text incomplete?

The parser extracts embedded PDF text. Scanned pages are images rather than
embedded text; OCR is not included in the packaged app. Review and correct the
draft manually.

### Why is ATS analysis missing?

It is disabled by default. Enable `ATS_SCAN_ENABLED` as described in
[Feature flags](feature-flags.md), then restart the app.

### Where are my files?

The app stores its data in the `ATSCheck` directory under your home folder.
The [setup guide](SETUP.md#data-privacy-and-backups) documents the files and
backup guidance.
