import JSZip from "jszip";

const PAGE_BREAK_XML =
  '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

function extractBodyContent(documentXml: string): {
  inner: string;
  sectPr: string;
} {
  const bodyMatch = documentXml.match(/<w:body\b[^>]*>([\s\S]*)<\/w:body>/i);
  if (!bodyMatch) {
    throw new Error("Invalid Word document: missing document body.");
  }
  let inner = bodyMatch[1] ?? "";
  const sectMatch = inner.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/i);
  const sectPr = sectMatch?.[0] ?? "";
  if (sectPr) {
    inner = inner.replace(sectPr, "");
  }
  return { inner: inner.trim(), sectPr };
}

function maxRelationshipId(relsXml: string): number {
  let max = 0;
  for (const match of relsXml.matchAll(/\bId="rId(\d+)"/gi)) {
    max = Math.max(max, Number(match[1]));
  }
  return max;
}

function emptyRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
}

/**
 * Merge DOCX buffers into one document.
 * Copies body content and remaps media relationships so images survive.
 */
export async function mergeDocxBuffers(
  buffers: Buffer[],
  options: { pageBreakBetween?: boolean } = {}
): Promise<Buffer> {
  if (buffers.length === 0) {
    throw new Error("No Word documents to merge.");
  }

  const pageBreakBetween = options.pageBreakBetween !== false;
  const base = await JSZip.loadAsync(buffers[0]!);
  const baseDocFile = base.file("word/document.xml");
  if (!baseDocFile) {
    throw new Error("Invalid Word document: missing word/document.xml.");
  }

  let baseDocXml = await baseDocFile.async("string");
  const { inner: firstBody, sectPr } = extractBodyContent(baseDocXml);
  const parts: string[] = [firstBody];

  const relsPath = "word/_rels/document.xml.rels";
  let relsXml = (await base.file(relsPath)?.async("string")) ?? emptyRels();
  let nextRelId = maxRelationshipId(relsXml) + 1;

  for (let i = 1; i < buffers.length; i++) {
    const zip = await JSZip.loadAsync(buffers[i]!);
    const docFile = zip.file("word/document.xml");
    if (!docFile) {
      throw new Error(`File ${i + 1} is not a valid Word document.`);
    }
    const docXml = await docFile.async("string");
    let { inner } = extractBodyContent(docXml);

    const srcRels = await zip.file(relsPath)?.async("string");
    if (srcRels) {
      const remapped = await remapDocxMedia(zip, base, inner, srcRels, i, () => {
        const id = nextRelId++;
        return `rId${id}`;
      });
      inner = remapped.body;
      relsXml = insertRelationships(relsXml, remapped.relationships);
    }

    if (pageBreakBetween) parts.push(PAGE_BREAK_XML);
    parts.push(inner);
  }

  const mergedBody = `${parts.join("")}${sectPr}`;
  baseDocXml = baseDocXml.replace(
    /<w:body\b[^>]*>[\s\S]*<\/w:body>/i,
    `<w:body>${mergedBody}</w:body>`
  );
  base.file("word/document.xml", baseDocXml);
  base.file(relsPath, relsXml);

  return Buffer.from(
    await base.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
    })
  );
}

async function remapDocxMedia(
  source: JSZip,
  target: JSZip,
  bodyXml: string,
  relsXml: string,
  fileIndex: number,
  nextId: () => string
): Promise<{ body: string; relationships: string[] }> {
  const relationships: string[] = [];
  let body = bodyXml;

  const relMatches = [
    ...relsXml.matchAll(
      /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bType="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*\/>/gi
    ),
  ];

  for (const match of relMatches) {
    const oldId = match[1]!;
    const type = match[2]!;
    const targetPath = match[3]!;
    if (targetPath.startsWith("http") || targetPath.includes("#")) continue;

    const normalized = targetPath.replace(/^\//, "");
    const fullPath = normalized.startsWith("word/")
      ? normalized
      : `word/${normalized.replace(/^\.\.\//, "")}`;

    // Prefer media / embeddings / headers that live under word/
    const candidatePaths = [
      fullPath,
      `word/${targetPath.replace(/^\.\.\//, "")}`,
      targetPath.startsWith("media/") ? `word/${targetPath}` : null,
    ].filter(Boolean) as string[];

    let fileData: Uint8Array | null = null;
    let usedPath = "";
    for (const p of candidatePaths) {
      const f = source.file(p);
      if (f) {
        fileData = await f.async("uint8array");
        usedPath = p;
        break;
      }
    }
    if (!fileData) continue;

    const baseName = usedPath.split("/").pop() ?? `part-${oldId}`;
    const newRelPath = `media/merged_${fileIndex}_${baseName}`;
    const zipPath = `word/${newRelPath}`;
    target.file(zipPath, fileData);

    const newId = nextId();
    relationships.push(
      `<Relationship Id="${newId}" Type="${type}" Target="${newRelPath}"/>`
    );

    const idPattern = new RegExp(`\\b(r:embed|r:id|r:link)="${oldId}"`, "gi");
    body = body.replace(idPattern, `$1="${newId}"`);
  }

  return { body, relationships };
}

function insertRelationships(relsXml: string, relationships: string[]): string {
  if (!relationships.length) return relsXml;
  if (/<\/Relationships>/i.test(relsXml)) {
    return relsXml.replace(
      /<\/Relationships>/i,
      `${relationships.join("")}</Relationships>`
    );
  }
  return emptyRels().replace(
    /<\/Relationships>/i,
    `${relationships.join("")}</Relationships>`
  );
}

/**
 * Merge PPTX decks by appending slides from each file into the first.
 */
export async function mergePptxBuffers(buffers: Buffer[]): Promise<Buffer> {
  if (buffers.length === 0) {
    throw new Error("No PowerPoint files to merge.");
  }

  const base = await JSZip.loadAsync(buffers[0]!);
  const presentationPath = "ppt/presentation.xml";
  const presentationRelsPath = "ppt/_rels/presentation.xml.rels";
  const contentTypesPath = "[Content_Types].xml";

  let presentationXml = await mustRead(base, presentationPath);
  let presentationRels = await mustRead(base, presentationRelsPath);
  let contentTypes = await mustRead(base, contentTypesPath);

  let slideCount = countSlides(presentationRels);
  let nextRelId = maxRelationshipId(presentationRels) + 1;

  // Reuse a layout from the base deck for imported slides (avoids missing layout parts).
  const baseLayoutTarget =
    [...presentationRels.matchAll(
      /<Relationship\b[^>]*\bType="[^"]*\/relationships\/slideLayout"[^>]*\bTarget="([^"]+)"[^>]*\/>/gi
    )][0]?.[1] ??
    [...(await mustRead(base, "ppt/slides/_rels/slide1.xml.rels").catch(() => "")).matchAll(
      /<Relationship\b[^>]*\bType="[^"]*\/relationships\/slideLayout"[^>]*\bTarget="([^"]+)"[^>]*\/>/gi
    )][0]?.[1] ??
    "../slideLayouts/slideLayout1.xml";

  for (let fileIndex = 1; fileIndex < buffers.length; fileIndex++) {
    const src = await JSZip.loadAsync(buffers[fileIndex]!);
    const srcRels = await mustRead(src, presentationRelsPath);
    const srcSlides = [
      ...srcRels.matchAll(
        /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bType="[^"]*\/relationships\/slide"[^>]*\bTarget="([^"]+)"[^>]*\/>/gi
      ),
    ];

    for (const slideRel of srcSlides) {
      slideCount += 1;
      const srcTarget = slideRel[2]!.replace(/^\//, "");
      const srcSlidePath = srcTarget.startsWith("ppt/")
        ? srcTarget
        : `ppt/${srcTarget}`;
      const srcSlideRelsPath = srcSlidePath.replace(
        /slides\/([^/]+)$/,
        "slides/_rels/$1.rels"
      );

      const slideXml = await mustRead(src, srcSlidePath);
      const slideRelsXml = (await src.file(srcSlideRelsPath)?.async("string")) ??
        emptyRels();

      const newSlideName = `slide${slideCount}.xml`;
      const newSlidePath = `ppt/slides/${newSlideName}`;
      const newSlideRelsPath = `ppt/slides/_rels/${newSlideName}.rels`;

      const { slideXml: remappedSlide, slideRels, mediaFiles } =
        await remapPptxSlideAssets(
          src,
          slideXml,
          slideRelsXml,
          fileIndex,
          slideCount,
          baseLayoutTarget
        );

      base.file(newSlidePath, remappedSlide);
      base.file(newSlideRelsPath, slideRels);
      for (const [path, data] of mediaFiles) {
        base.file(path, data);
      }

      const relId = `rId${nextRelId++}`;
      presentationRels = insertRelationships(presentationRels, [
        `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/${newSlideName}"/>`,
      ]);

      // Insert sldId into presentation.xml sldIdLst
      const sldId = 255 + slideCount;
      const sldIdEntry = `<p:sldId id="${sldId}" r:id="${relId}"/>`;
      if (/<p:sldIdLst\b[^>]*>/i.test(presentationXml)) {
        presentationXml = presentationXml.replace(
          /<\/p:sldIdLst>/i,
          `${sldIdEntry}</p:sldIdLst>`
        );
      } else {
        presentationXml = presentationXml.replace(
          /(<p:sldMasterIdLst\b[\s\S]*?<\/p:sldMasterIdLst>)/i,
          `$1<p:sldIdLst>${sldIdEntry}</p:sldIdLst>`
        );
      }

      if (!contentTypes.includes(`PartName="/ppt/slides/${newSlideName}"`)) {
        contentTypes = contentTypes.replace(
          /<\/Types>/i,
          `<Override PartName="/ppt/slides/${newSlideName}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`
        );
      }
    }
  }

  base.file(presentationPath, presentationXml);
  base.file(presentationRelsPath, presentationRels);
  base.file(contentTypesPath, contentTypes);

  return Buffer.from(
    await base.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
    })
  );
}

function countSlides(presentationRels: string): number {
  return [
    ...presentationRels.matchAll(/\/relationships\/slide"/gi),
  ].length;
}

async function mustRead(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  if (!file) throw new Error(`Invalid PowerPoint file: missing ${path}.`);
  return file.async("string");
}

async function remapPptxSlideAssets(
  source: JSZip,
  slideXml: string,
  slideRelsXml: string,
  fileIndex: number,
  slideNum: number,
  baseLayoutTarget: string
): Promise<{
  slideXml: string;
  slideRels: string;
  mediaFiles: Map<string, Uint8Array>;
}> {
  const mediaFiles = new Map<string, Uint8Array>();
  let xml = slideXml;
  const newRels: string[] = [];
  let relCounter = 1;

  const relMatches = [
    ...slideRelsXml.matchAll(
      /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bType="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*\/?>/gi
    ),
  ];

  for (const match of relMatches) {
    const oldId = match[1]!;
    const type = match[2]!;
    const target = match[3]!;
    const newId = `rId${relCounter++}`;

    if (type.includes("/slideLayout")) {
      newRels.push(
        `<Relationship Id="${newId}" Type="${type}" Target="${baseLayoutTarget}"/>`
      );
      xml = xml.replaceAll(`"${oldId}"`, `"${newId}"`);
      continue;
    }

    if (target.startsWith("http")) {
      newRels.push(
        `<Relationship Id="${newId}" Type="${type}" Target="${target}"/>`
      );
      xml = xml.replaceAll(`"${oldId}"`, `"${newId}"`);
      continue;
    }

    const resolved = resolvePptPath(target);
    const file = source.file(resolved);
    if (
      file &&
      (resolved.includes("/media/") ||
        resolved.includes("/embeddings/") ||
        resolved.includes("/charts/"))
    ) {
      const data = await file.async("uint8array");
      const baseName = resolved.split("/").pop() ?? `asset-${oldId}`;
      const folder = resolved.includes("/embeddings/")
        ? "embeddings"
        : resolved.includes("/charts/")
          ? "charts"
          : "media";
      const newPath = `ppt/${folder}/m${fileIndex}_s${slideNum}_${baseName}`;
      mediaFiles.set(newPath, data);
      const relTarget = `../${folder}/m${fileIndex}_s${slideNum}_${baseName}`;
      newRels.push(
        `<Relationship Id="${newId}" Type="${type}" Target="${relTarget}"/>`
      );
    } else {
      newRels.push(
        `<Relationship Id="${newId}" Type="${type}" Target="${target}"/>`
      );
    }
    xml = xml.replaceAll(`"${oldId}"`, `"${newId}"`);
  }

  const slideRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${newRels.join("\n")}
</Relationships>`;

  return { slideXml: xml, slideRels, mediaFiles };
}

function resolvePptPath(target: string): string {
  const cleaned = target.replace(/^\//, "");
  if (cleaned.startsWith("ppt/")) return cleaned;
  if (cleaned.startsWith("../")) {
    return `ppt/${cleaned.replace(/^(\.\.\/)+/, "")}`;
  }
  return `ppt/slides/${cleaned}`;
}
