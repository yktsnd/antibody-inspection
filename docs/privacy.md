# Privacy and local storage

Antibody Inspection does not require an account and does not contain telemetry. Imported sequences, structures and experimental observations are processed on the local computer. The webview uses a restrictive Content Security Policy with external connections disabled.

## Files and recovery

Saved projects are plain-text JSON chosen by the user. They contain sequences, imported content, results, coordinates, source metadata and views; they are not encrypted. Exporting or sharing a project also shares those data.

VS Code global extension storage contains a recovery copy of recent work, a bounded local analysis cache, the private Python runtime and any explicitly prepared prediction models. On Windows the default location is `%APPDATA%\Code\User\globalStorage\yktsnd.antibody-inspection`. Other VS Code distributions and profiles may use different locations. Removing the extension does not necessarily remove this storage. Manage confidential files according to your own organization’s storage policy.

## Network use

Installation of the scientific runtime downloads packages from package repositories. Model preparation downloads official model files and verifies checksums. These steps do not upload research input. The reference-maintenance scripts used by developers may retrieve public source records. Supported analysis is local after installation and preparation.

VS Code, the operating system and other extensions have separate network and data policies. Remote VS Code windows are not supported by this extension; open a local window.

## Reporting a problem

Public issues should contain public or synthetic examples. Scientific project files can embed confidential sequences even when their filenames appear harmless. Runtime diagnostics identify installed versions and setup failures; inspect any attached logs before posting them publicly.

The analysis cache can retain derived sequence and structure results. Its keys include inputs, method, worker source, reference contents and dependency versions. The cache is bounded to 512 MiB and damaged entries are recomputed. OASis reference evaluation and structure prediction are not cached by this layer.
