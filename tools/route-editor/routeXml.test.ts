import { describe, expect, test } from "bun:test";
import * as path from "path";
import {
  buildFullSvg,
  buildRouteGroupXml,
  escapeXmlAttribute,
  formatRouteCoordinate,
  replaceRouteGroupInSvg,
  type RouteXmlEdge,
  type RouteXmlNode,
} from "./routeXml.js";

const nodes: RouteXmlNode[] = [
  {
    id: 'node&"<',
    kind: "stairs>",
    placeId: "place&",
    stairId: "stair<",
    entranceId: '"door"',
    x: 1.23456,
    y: 2.34544,
  },
  {
    id: "node-b",
    kind: "corridor",
    x: 9.87654,
    y: -1.2344,
  },
];

const edges: RouteXmlEdge[] = [
  { id: "edge&", a: 'node&"<', b: "node-b" },
  { id: "edge-missing", a: "node-b", b: "missing" },
];

describe("route editor Route XML", () => {
  test("attribute escapeと座標小数3桁丸めを維持する", () => {
    expect(escapeXmlAttribute('&<>"')).toEqual("&amp;&lt;&gt;&quot;");
    expect(formatRouteCoordinate(1.23456)).toEqual("1.235");
    expect(formatRouteCoordinate(-1.2344)).toEqual("-1.234");
    expect(formatRouteCoordinate(-0.0004)).toEqual("0");
  });

  test("Route groupの属性・optional属性・挿入順・indentをexact生成する", () => {
    expect(
      buildRouteGroupXml({
        routeIndent: "  ",
        groupFloorId: 'floor&"<',
        nodes,
        edges,
      }),
    ).toEqual(`  <g
     id="Route"
     data-floor-id="floor&amp;&quot;&lt;"
     style="display:none">
    <circle
       id="node&amp;&quot;&lt;"
       data-route-node=""
       data-kind="stairs&gt;"
       data-place-id="place&amp;"
       data-stair-id="stair&lt;"
       data-entrance-id="&quot;door&quot;"
       cx="1.235"
       cy="2.345"
       r="2" />
    <circle
       id="node-b"
       data-route-node=""
       data-kind="corridor"
       cx="9.877"
       cy="-1.234"
       r="2" />
    <path
       id="edge&amp;"
       data-route-edge=""
       data-node-a="node&amp;&quot;&lt;"
       data-node-b="node-b"
       d="M 1.235 2.345 L 9.877 -1.234" />
    <path
       id="edge-missing"
       data-route-edge=""
       data-node-a="node-b"
       data-node-b="missing"
       d="" />
  </g>`);

    const fallbackExpected = `    <g
       id="Route"
       style="display:none">
      <circle
         id="node"
         data-route-node=""
         data-kind="corridor"
         cx="0"
         cy="0"
         r="2" />
    </g>`;
    const emptyOptionalNode: RouteXmlNode = {
      id: "node",
      kind: "corridor",
      placeId: "",
      stairId: "",
      entranceId: "",
      x: 0,
      y: 0,
    };
    expect(
      buildRouteGroupXml({ nodes: [emptyOptionalNode], edges: [] }),
    ).toEqual(fallbackExpected);
    expect(
      buildRouteGroupXml({
        routeIndent: null,
        groupFloorId: "",
        nodes: [emptyOptionalNode],
        edges: [],
      }),
    ).toEqual(fallbackExpected);
    expect(
      buildRouteGroupXml({
        routeIndent: "",
        groupFloorId: "",
        nodes: [emptyOptionalNode],
        edges: [],
      }),
    ).toEqual(fallbackExpected);
  });

  test("既存Routeだけを置換し先頭indentの現行扱いを維持する", () => {
    const routeXml = buildRouteGroupXml({
      routeIndent: "  ",
      groupFloorId: null,
      nodes: [],
      edges: [],
    });
    const rawSvg = `<?xml version="1.0"?>
<svg>
  <rect />
    <g id="Route" style="display:none">
      <circle />
    </g>
  <text />
</svg>
`;

    expect(replaceRouteGroupInSvg(rawSvg, routeXml)).toEqual(`<?xml version="1.0"?>
<svg>
  <rect />
<g
     id="Route"
     style="display:none">
  </g>
  <text />
</svg>
`);
  });

  test("Route未存在時はclosing svg直前へappendし末尾改行を正規化する", () => {
    const routeXml = buildRouteGroupXml({
      routeIndent: "    ",
      groupFloorId: "campus",
      nodes: [],
      edges: [],
    });

    expect(
      buildFullSvg({
        rawSvg: "<svg>\n  <rect />\n</svg>\n\n",
        routeIndent: "    ",
        groupFloorId: "campus",
        nodes: [],
        edges: [],
      }),
    ).toEqual(`<svg>
  <rect />
${routeXml}
</svg>
`);
    expect(replaceRouteGroupInSvg("<svg>broken", routeXml)).toEqual(
      "<svg>broken",
    );
  });

  test("生成IIFEがRoute XML coreを公開しinline手書き生成を残さない", async () => {
    const html = await Bun.file(
      path.join(import.meta.dirname, "../route-editor.html"),
    ).text();

    expect(html.includes("globalThis.UOAMAP_ROUTE_EDITOR_ROUTE_XML")).toEqual(
      true,
    );
    expect(html.includes("} = globalThis.UOAMAP_ROUTE_EDITOR_ROUTE_XML;")).toEqual(
      true,
    );
    expect(html.includes("function buildRouteGroup(ms){")).toEqual(false);
    expect(html.includes("const re = /[ \\t]*<g\\b")).toEqual(false);
  });
});
