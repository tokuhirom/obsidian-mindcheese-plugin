import MindmapExporter from "../MindmapExporter";
import Mind from "../../Mind";
import NodeTreeExporter from "../node_tree/NodeTreeExporter";
import { convertMM2MD } from "../../../MM2MDConverter";

export default class MarkdownExporter implements MindmapExporter {
  private node_tree_exporter: NodeTreeExporter;

  constructor() {
    this.node_tree_exporter = new NodeTreeExporter();
  }

  get_data(mind: Mind): string {
    const data = this.node_tree_exporter.get_data(mind);
    return convertMM2MD(data);
  }
}