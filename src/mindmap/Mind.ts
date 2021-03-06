// noinspection JSUnfilteredForInLoop

import MindNode from "./MindNode";
import { BEFOREID_FIRST, BEFOREID_LAST, Direction } from "./MindmapConstants";

export default class Mind {
  root: MindNode;
  selected: MindNode;
  nodes: Record<string, MindNode>;

  constructor() {
    this.root = null;
    this.selected = null;
    this.nodes = {};
  }

  getNodeById(nodeid: string): MindNode {
    if (nodeid in this.nodes) {
      return this.nodes[nodeid];
    } else {
      throw new Error(`the node[id=${nodeid}] can not be found...`);
    }
  }

  setRoot(nodeid: string, topic: string): void {
    if (this.root != null) {
      throw new Error("root node is already exist");
    }

    this.root = new MindNode(nodeid, 0, topic, true, null, null, true);
    this.putNode(this.root);
  }

  addNode(
    parentNode: MindNode,
    nodeid: string,
    topic: string,
    idx: number,
    direction: Direction | null,
    expanded: boolean
  ): MindNode {
    const nodeindex: number = idx || -1;
    let node;
    if (typeof expanded === "undefined") {
      // TODO remove this
      expanded = true;
    }
    if (parentNode.isroot) {
      let d;
      if (direction == null) {
        const children = parentNode.children;
        const childrenLength = children.length;
        let r = 0;
        for (let i = 0; i < childrenLength; i++) {
          if (children[i].direction === Direction.LEFT) {
            r--;
          } else {
            r++;
          }
        }
        d = childrenLength > 1 && r > 0 ? Direction.LEFT : Direction.RIGHT;
      } else {
        d = direction === Direction.LEFT ? Direction.LEFT : Direction.RIGHT;
      }
      console.log(
        `add_node source DIRECTION=${direction} DIRECTION=${d} ${topic}`
      );
      node = new MindNode(
        nodeid,
        nodeindex,
        topic,
        false,
        parentNode,
        d,
        expanded
      );
    } else {
      node = new MindNode(
        nodeid,
        nodeindex,
        topic,
        false,
        parentNode,
        parentNode.direction,
        expanded
      );
    }

    this.putNode(node);
    parentNode.children.push(node);
    this.reindex(parentNode);

    return node;
  }

  insertNodeBefore(
    nodeBefore: MindNode,
    nodeid: string,
    topic: string
  ): MindNode {
    const nodeIndex = nodeBefore.index - 0.5;
    return this.addNode(
      nodeBefore.parent,
      nodeid,
      topic,
      nodeIndex,
      null,
      true
    );
  }

  getNodeBefore(node: MindNode): MindNode {
    if (node.isroot) {
      return null;
    }

    const idx = node.index - 2;
    if (idx >= 0) {
      return node.parent.children[idx];
    } else {
      return null;
    }
  }

  // add little brother node.
  insertNodeAfter(
    nodeAfter: MindNode,
    nodeid: string,
    topic: string
  ): MindNode {
    const nodeIndex = nodeAfter.index + 0.5;
    // follow current direction.
    return this.addNode(
      nodeAfter.parent,
      nodeid,
      topic,
      nodeIndex,
      nodeAfter.direction,
      true
    );
  }

  getNodeAfter(node: MindNode): MindNode {
    if (node.isroot) {
      return null;
    }
    const idx = node.index;
    const brothers = node.parent.children;
    if (brothers.length >= idx) {
      return node.parent.children[idx];
    } else {
      return null;
    }
  }

  moveNode(
    node: MindNode,
    beforeid: string,
    parent: MindNode,
    direction: Direction
  ): void {
    console.assert(node instanceof MindNode, "node should be Node");
    console.log(`move_node: ${node} ${beforeid} ${parent.id} ${direction}`);
    this.doMoveNode(node, beforeid, parent, direction);
  }

  private flowNodeDirection(node: MindNode, direction: Direction): void {
    if (typeof direction === "undefined") {
      direction = node.direction;
    } else {
      node.direction = direction;
    }
    let len = node.children.length;
    while (len--) {
      this.flowNodeDirection(node.children[len], direction);
    }
  }

  private moveNodeInternal(node: MindNode, beforeid: string): MindNode {
    if (!!node && !!beforeid) {
      if (beforeid === BEFOREID_LAST) {
        node.index = -1;
        this.reindex(node.parent);
      } else if (beforeid === BEFOREID_FIRST) {
        node.index = 0;
        this.reindex(node.parent);
      } else {
        /*
         * Before:
         *   - B <- beforeid = 3
         *   - A <- node     = 4
         *
         * After:
         *   - A <- node     = 3-0.5=2.5
         *   - B <- beforeid = 3
         */
        const nodeBefore = beforeid ? this.getNodeById(beforeid) : null;
        if (
          nodeBefore != null &&
          nodeBefore.parent != null &&
          nodeBefore.parent.id === node.parent.id
        ) {
          node.index = nodeBefore.index - 0.5;
          this.reindex(node.parent);
        } else {
          console.error(`Missing node_before: ${beforeid}`);
        }
      }
    }
    return node;
  }

  private doMoveNode(
    node: MindNode,
    beforeid: string,
    parent: MindNode,
    direction: Direction
  ): void {
    console.log(
      `_move_node: node=${node}, ${beforeid}, parentid=${parent.id}, ${direction}`
    );
    if (!!node && !!parent.id) {
      console.assert(node.parent, `node.parent is null: ${node}`);
      if (node.parent.id !== parent.id) {
        console.log(`_move_node: node.parent.id!==parentid`);
        // remove from parent's children
        const sibling = node.parent.children;
        let si = sibling.length;
        while (si--) {
          console.assert(sibling[si], "sibling[si] is null");
          if (sibling[si].id === node.id) {
            sibling.splice(si, 1);
            break;
          }
        }
        node.parent = this.getNodeById(parent.id);
        node.parent.children.push(node);
      }

      if (node.parent.isroot) {
        node.direction = direction;
      } else {
        node.direction = node.parent.direction;
      }
      this.moveNodeInternal(node, beforeid);
      this.flowNodeDirection(node, direction);
    }
  }

  removeNode(node: MindNode): boolean {
    if (node.isroot) {
      throw new Error("fail, can not remove root node");
    }
    if (this.selected != null && this.selected.id === node.id) {
      this.selected = null;
    }

    // clean all subordinate nodes
    const children = node.children;
    let ci = children.length;
    while (ci--) {
      this.removeNode(children[ci]);
    }

    // clean all children
    children.length = 0;

    // remove from parent's children
    const sibling = node.parent.children;
    let si = sibling.length;
    while (si--) {
      if (sibling[si].id === node.id) {
        sibling.splice(si, 1);
        break;
      }
    }

    // remove from global nodes
    delete this.nodes[node.id];

    return true;
  }

  private putNode(node: MindNode): void {
    if (node.id in this.nodes) {
      throw new Error("the nodeid '" + node.id + "' has been already exist.");
    }

    this.nodes[node.id] = node;
  }

  private reindex(node: MindNode): void {
    console.debug(
      `Before Mind._reindex: ` +
        node.children.map((n) => `${n.topic}: ${n.index}`).join("\n")
    );
    node.children.sort(MindNode.compare);
    for (let i = 0; i < node.children.length; i++) {
      node.children[i].index = i + 1;
    }
    console.debug(
      `After Mind._reindex: ` +
        node.children.map((n) => `${n.topic}: ${n.index}`).join("\n")
    );
  }
}
