# MD Commenter — comment on rendered Markdown in Pull Requests

Azure DevOps does not allow commenting on the **preview** of a `.md` file in a Pull Request, only on the plain-text diff. This extension adds an **MD Commenter** tab to the PR where you can:

- See each modified Markdown file **rendered**.
- **Click any block** (paragraph, heading, list item, table row, code block) or **select a fragment of text**.
- Write the comment and it is published as a **normal PR thread**, anchored to the exact lines and columns of the source file. It appears in the *Files* tab and in *Overview* just like any other comment.
- Existing comments are marked over the preview. You can reply, resolve, and reactivate from the panel.

![Concept](https://assets.7rush.com/projects/md-commenter/concept.png)

## How it works

1. **Line map**: `markdown-it` exposes on each token the source line range (`token.map`). A core rule injects it as `data-sl` / `data-el` on each block element, the same technique the VS Code preview uses.
2. **Click → anchor**: the click resolves the nearest block. If there is selected text, it is searched within those lines, first exact and then from the first to the last word, because the rendered text does not have the `**`, `` ` ``, etc. syntax needed to compute the exact column.
3. **Thread**: `POST …/pullRequests/{id}/threads` with `threadContext.rightFileStart/End` and `pullRequestThreadContext` (`changeTrackingId` + iteration 1 → last), just like a comment made from the diff.

## Permissions

`vso.code` (Code, read): read repo files and PR metadata. `vso.threads_full` (Pull Request Threads, read & write): create, reply to, and update PR comment threads — with the identity of the reviewing user. The extension never pushes or writes code.

## Known limitations

- Standard Markdown is rendered (CommonMark + tables). Azure DevOps wiki-specific features, such as `[[_TOC_]]`, Mermaid, or formulas, appear as text.
- HTML embedded in the `.md` is shown escaped, for security.
- Commenting requires the file to exist in the latest iteration; deleted files are skipped.

---

# MD Commenter — comentar sobre Markdown renderizado en Pull Requests

Azure DevOps no permite comentar sobre el **preview** de un archivo `.md` en un Pull Request, solo sobre el diff en texto plano. Esta extensión agrega una pestaña **MD Commenter** al PR donde:

- Ves cada archivo Markdown modificado **renderizado**.
- Haces **clic en cualquier bloque** (párrafo, título, ítem de lista, fila de tabla, bloque de código) o **seleccionas un fragmento de texto**.
- Escribes el comentario y se publica como un **thread normal del PR**, anclado a las líneas y columnas exactas del archivo fuente. Aparece en la pestaña *Files* y en *Overview* igual que cualquier otro comentario.
- Los comentarios existentes se marcan sobre el preview. Puedes responder, resolver y reactivar desde el panel.

![Concept](https://assets.7rush.com/projects/md-commenter/concept.png)

## Cómo funciona

1. **Mapa de líneas**: `markdown-it` expone en cada token el rango de líneas fuente (`token.map`). Una regla del core lo inyecta como `data-sl` / `data-el` en cada elemento de bloque, la misma técnica que usa el preview de VS Code.
2. **Clic → ancla**: el clic resuelve el bloque más cercano. Si hay texto seleccionado, se busca dentro de esas líneas, primero exacto y luego de la primera a la última palabra, porque el texto renderizado no tiene la sintaxis `**`, `` ` ``, etc., para calcular la columna exacta.
3. **Thread**: `POST …/pullRequests/{id}/threads` con `threadContext.rightFileStart/End` y `pullRequestThreadContext` (`changeTrackingId` + iteración 1 → última), igual que un comentario hecho desde el diff.


## Permisos

`vso.code` (Código, lectura): leer archivos del repo y metadatos del PR. `vso.threads_full` (Threads de Pull Request, lectura y escritura): crear, responder y actualizar threads de comentarios del PR — con la identidad del usuario que revisa. La extensión nunca hace push ni escribe código.

## Limitaciones conocidas

- Se renderiza Markdown estándar (CommonMark + tablas). Lo específico del wiki de Azure DevOps, como `[[_TOC_]]`, Mermaid o fórmulas, se ve como texto.
- El HTML embebido en el `.md` se muestra escapado, por seguridad.
- Comentar requiere que el archivo exista en la última iteración; los archivos eliminados se omiten.
