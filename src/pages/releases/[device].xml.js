// One release feed per iPod model, e.g. /releases/ipod-classic.xml
import { deviceById } from "../../lib/catalog.js";
import { followable, releaseFeed } from "../../lib/releases.js";

export const getStaticPaths = () => followable.map((d) => ({ params: { device: d.id } }));

export const GET = ({ site, params }) => releaseFeed({ site, device: deviceById[params.device] });
