# Security policy

## Supported versions

Security fixes are applied to the latest published release. Older releases may
not receive fixes; update to the latest version when possible.

## Reporting a vulnerability

Please do not report exploitable vulnerabilities in a public issue. Use the
repository host's private vulnerability-reporting feature. If it is unavailable,
contact the maintainers privately through the contact information on the
repository profile and include:

- The affected version and operating system
- A concise description of the impact
- Reproduction steps that do not expose real personal data or credentials
- Any suggested mitigation

Please allow maintainers time to investigate and coordinate a fix before public
disclosure. Do not include real resumes, API keys, or other sensitive material
in a report.

## Data and network behavior

- Resume files and the SQLite database are stored locally under the user's
  `ATSCheck` directory.
- Provider API keys are stored in the operating system credential store.
- When a cloud LLM provider is configured, resume or job-description text may be
  sent to that provider to fulfill the requested operation. Review the
  provider's data-handling terms before use.
- Ollama can be configured as a local provider; its model must be installed and
  its server running separately.
- The packaged API binds to `127.0.0.1`; it is not intended to be exposed to a
  network.

The user is responsible for protecting local files and choosing providers
appropriate for their data.
