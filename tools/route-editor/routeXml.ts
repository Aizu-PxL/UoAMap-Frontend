export type RouteXmlNode = {
  id: string;
  kind: string;
  x: number;
  y: number;
  placeId?: string;
  stairId?: string;
  entranceId?: string;
};

export type RouteXmlEdge = {
  id: string;
  a: string;
  b: string;
};

export type RouteXmlInput = {
  rawSvg: string;
  routeIndent?: string | null;
  groupFloorId?: string | null;
  nodes: readonly RouteXmlNode[];
  edges: readonly RouteXmlEdge[];
};

export function escapeXmlAttribute(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatRouteCoordinate(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

export function buildRouteGroupXml(
  input: Omit<RouteXmlInput, "rawSvg">,
): string {
  const indent = input.routeIndent || "    ";
  const childIndent = `${indent}  `;
  const attributes = ['id="Route"'];
  if (input.groupFloorId) {
    attributes.push(
      `data-floor-id="${escapeXmlAttribute(input.groupFloorId)}"`,
    );
  }
  attributes.push('style="display:none"');

  let output = `${indent}<g\n${indent}   ${attributes.join(`\n${indent}   `)}>`;
  for (const node of input.nodes) {
    output += `\n${childIndent}<circle`;
    output += `\n${childIndent}   id="${escapeXmlAttribute(node.id)}"`;
    output += `\n${childIndent}   data-route-node=""`;
    output += `\n${childIndent}   data-kind="${escapeXmlAttribute(node.kind)}"`;
    if (node.placeId) {
      output += `\n${childIndent}   data-place-id="${escapeXmlAttribute(node.placeId)}"`;
    }
    if (node.stairId) {
      output += `\n${childIndent}   data-stair-id="${escapeXmlAttribute(node.stairId)}"`;
    }
    if (node.entranceId) {
      output += `\n${childIndent}   data-entrance-id="${escapeXmlAttribute(node.entranceId)}"`;
    }
    output += `\n${childIndent}   cx="${formatRouteCoordinate(node.x)}"`;
    output += `\n${childIndent}   cy="${formatRouteCoordinate(node.y)}"`;
    output += `\n${childIndent}   r="2" />`;
  }

  const nodeById = new Map(input.nodes.map((node) => [node.id, node]));
  for (const edge of input.edges) {
    const start = nodeById.get(edge.a);
    const end = nodeById.get(edge.b);
    const path =
      start && end
        ? `M ${formatRouteCoordinate(start.x)} ${formatRouteCoordinate(start.y)} L ${formatRouteCoordinate(end.x)} ${formatRouteCoordinate(end.y)}`
        : "";
    output += `\n${childIndent}<path`;
    output += `\n${childIndent}   id="${escapeXmlAttribute(edge.id)}"`;
    output += `\n${childIndent}   data-route-edge=""`;
    output += `\n${childIndent}   data-node-a="${escapeXmlAttribute(edge.a)}"`;
    output += `\n${childIndent}   data-node-b="${escapeXmlAttribute(edge.b)}"`;
    output += `\n${childIndent}   d="${path}" />`;
  }

  output += `\n${indent}</g>`;
  return output;
}

export function replaceRouteGroupInSvg(
  rawSvg: string,
  routeXml: string,
): string {
  const routePattern = /[ \t]*<g\b[^>]*\bid="Route"[\s\S]*?<\/g>/;
  if (routePattern.test(rawSvg)) {
    return rawSvg.replace(routePattern, () => routeXml.replace(/^[ \t]+/, ""));
  }
  return rawSvg.replace(
    /<\/svg>\s*$/,
    () => `${routeXml}\n</svg>\n`,
  );
}

export function buildFullSvg(input: RouteXmlInput): string {
  return replaceRouteGroupInSvg(
    input.rawSvg,
    buildRouteGroupXml({
      routeIndent: input.routeIndent,
      groupFloorId: input.groupFloorId,
      nodes: input.nodes,
      edges: input.edges,
    }),
  );
}

export const routeEditorRouteXml = {
  buildFullSvg,
  buildRouteGroupXml,
  escapeXmlAttribute,
  formatRouteCoordinate,
  replaceRouteGroupInSvg,
};

export type RouteEditorRouteXml = typeof routeEditorRouteXml;
