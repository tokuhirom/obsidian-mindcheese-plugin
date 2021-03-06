import MindmapExporter from "../MindmapExporter";
import Mind from "../../Mind";
import MindNode from "../../MindNode";
import { Direction } from "../../MindmapConstants";

export default class NodeTreeExporter implements MindmapExporter {
  getData(mind: Mind): Record<string, any> {
    const json: Record<string, any> = {};
    json.format = "node_tree";
    json.data = this.buildNode(mind.root);
    return json;
  }

  private buildNode(node: MindNode): Record<string, any> {
    if (!(node instanceof MindNode)) {
      return;
    }
    const o: Record<string, any> = {
      id: node.id,
      topic: node.topic,
      expanded: node.expanded,
    };
    if (!!node.parent && node.parent.isroot) {
      o.direction = node.direction == Direction.LEFT ? "left" : "right";
    }
    const children = node.children;
    if (children.length > 0) {
      o.children = [];
      for (let i = 0; i < children.length; i++) {
        o.children.push(this.buildNode(children[i]));
      }
    }
    return o;
  }
}
