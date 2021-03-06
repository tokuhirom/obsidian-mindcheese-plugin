// noinspection JSUnfilteredForInLoop

/*
 * Released under BSD License
 * Copyright (c) 2014-2015 hizzgdev@163.com
 *
 * Project Home:
 *   https://github.com/hizzgdev/jsmind/
 */

/**
 * Modified by tokuhirom.
 * - support npm.
 * - replace var with let/const.
 * Copyright (C) 2021 Tokuhiro Matsuno.
 */

import MindCheese from "./MindCheese";
import MindNode from "./MindNode";
import {
  BEFOREID_FIRST,
  BEFOREID_LAST,
  Direction,
  EventType,
} from "./MindmapConstants";
import EventRouter from "./EventRouter";
import { Point } from "./LayoutProvider";

export default class Draggable {
  private jm: MindCheese;
  private canvasElement: HTMLCanvasElement;
  private canvasContext: CanvasRenderingContext2D;
  private shadow: HTMLElement;
  private shadowW: number;
  private shadowH: number;
  private activeNode: MindNode;
  private targetNode: MindNode;
  private targetDirect: Direction;
  private clientW: number;
  private clientH: number;
  private offsetX: number;
  private offsetY: number;
  private hlookupDelay: number;
  private hlookupTimer: number;
  private capture: boolean;
  private moved: boolean;
  private clientHW: number;
  private clientHH: number;
  private readonly lineWidth = 5;
  private readonly lookupDelay = 500;
  private readonly lookupInterval = 80;
  private readonly eventRouter: EventRouter;

  constructor(jm: MindCheese, eventRouter: EventRouter) {
    this.jm = jm;
    this.eventRouter = eventRouter;
    this.canvasElement = null;
    this.canvasContext = null;
    this.shadow = null;
    this.shadowW = 0;
    this.shadowH = 0;
    this.activeNode = null;
    this.targetNode = null;
    this.targetDirect = null;
    this.clientW = 0;
    this.clientH = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.hlookupDelay = 0;
    this.hlookupTimer = 0;
    this.capture = false;
    this.moved = false;
  }

  init(container: HTMLElement): void {
    this.createCanvas();
    this.createShadow();
    this.eventBind(container);
    this.eventRouter.addEventListener(EventType.Resize, this.resize.bind(this));
  }

  resize(): void {
    this.jm.view.jmnodes.appendChild(this.shadow);
    this.canvasElement.width = this.jm.view.size.w;
    this.canvasElement.height = this.jm.view.size.h;
  }

  private createCanvas(): void {
    const c: HTMLCanvasElement = document.createElement("canvas");
    c.className = "jsmind-draggable";
    this.jm.view.jsmindInnerElement.appendChild(c);
    const ctx: CanvasRenderingContext2D = c.getContext("2d");
    this.canvasElement = c;
    this.canvasContext = ctx;
  }

  private createShadow(): void {
    const s: HTMLElement = document.createElement("jmnode");
    s.style.visibility = "hidden";
    s.style.zIndex = "3";
    s.style.cursor = "move";
    s.style.opacity = "0.7";
    this.shadow = s;
  }

  resetShadow(el: HTMLElement): void {
    const s = this.shadow.style;
    this.shadow.innerHTML = el.innerHTML;
    s.left = el.style.left;
    s.top = el.style.top;
    s.width = el.style.width;
    s.height = el.style.height;
    s.backgroundImage = el.style.backgroundImage;
    s.backgroundSize = el.style.backgroundSize;
    s.transform = el.style.transform;
    this.shadowW = this.shadow.clientWidth;
    this.shadowH = this.shadow.clientHeight;
  }

  showShadow(): void {
    if (!this.moved) {
      this.shadow.style.visibility = "visible";
    }
  }

  hideShadow(): void {
    this.shadow.style.visibility = "hidden";
  }

  private magnetShadow(node: {
    node: any;
    np: any;
    sp: any;
    direction: number;
  }): void {
    if (node) {
      this.canvasContext.lineWidth = this.lineWidth;
      this.canvasContext.strokeStyle = "rgba(0,0,0,0.3)";
      this.canvasContext.lineCap = "round";
      this.clearLines();
      this.canvasLineTo(node.sp.x, node.sp.y, node.np.x, node.np.y);
    }
  }

  private clearLines(): void {
    this.canvasContext.clearRect(
      0,
      0,
      this.jm.view.size.w,
      this.jm.view.size.h
    );
  }

  private canvasLineTo(x1: number, y1: number, x2: number, y2: number): void {
    this.canvasContext.beginPath();
    this.canvasContext.moveTo(x1, y1);
    this.canvasContext.lineTo(x2, y2);
    this.canvasContext.stroke();
  }

  private doLookupCloseNode(): {
    node: MindNode;
    np: any;
    sp: any;
    direction: Direction;
  } {
    const root = this.jm.getRoot();
    const rootLocation = root.getLocation();
    const rootSize = root.getSize();
    const rootX = rootLocation.x + rootSize.w / 2;

    const sw = this.shadowW;
    const sh = this.shadowH;
    const sx = this.shadow.offsetLeft;
    const sy = this.shadow.offsetTop;

    let ns, nl;

    const direct = sx + sw / 2 >= rootX ? Direction.RIGHT : Direction.LEFT;
    const nodes = this.jm.mind.nodes;
    let node = null;
    let minDistance = Number.MAX_VALUE;
    let distance = 0;
    let closestNode = null;
    let closestPoint: Point = null;
    let shadowPoint: Point = null;
    for (const nodeid in nodes) {
      let np, sp;
      node = nodes[nodeid];
      if (node.isroot || node.direction == direct) {
        if (node.id == this.activeNode.id) {
          continue;
        }
        ns = node.getSize();
        nl = node.getLocation();
        if (direct == Direction.RIGHT) {
          if (sx - nl.x - ns.w <= 0) {
            continue;
          }
          distance =
            Math.abs(sx - nl.x - ns.w) +
            Math.abs(sy + sh / 2 - nl.y - ns.h / 2);
          np = { x: nl.x + ns.w - this.lineWidth, y: nl.y + ns.h / 2 };
          sp = { x: sx + this.lineWidth, y: sy + sh / 2 };
        } else {
          if (nl.x - sx - sw <= 0) {
            continue;
          }
          distance =
            Math.abs(sx + sw - nl.x) + Math.abs(sy + sh / 2 - nl.y - ns.h / 2);
          np = { x: nl.x + this.lineWidth, y: nl.y + ns.h / 2 };
          sp = { x: sx + sw - this.lineWidth, y: sy + sh / 2 };
        }
        if (distance < minDistance) {
          closestNode = node;
          closestPoint = np;
          shadowPoint = sp;
          minDistance = distance;
        }
      }
    }
    if (closestNode) {
      return {
        node: closestNode,
        direction: direct,
        sp: shadowPoint,
        np: closestPoint,
      };
    } else {
      return null;
    }
  }

  lookupCloseNode(): void {
    const nodeData: {
      node: MindNode;
      np: any;
      sp: any;
      direction: Direction;
    } = this.doLookupCloseNode();
    if (nodeData) {
      this.magnetShadow(nodeData);
      this.targetNode = nodeData.node;
      this.targetDirect = nodeData.direction;
    }
  }

  private eventBind(container: HTMLElement): void {
    container.addEventListener("mousedown", this.dragstart.bind(this), false);
    container.addEventListener("mousemove", this.drag.bind(this), false);
    container.addEventListener("mouseup", this.dragend.bind(this), false);
    container.addEventListener("touchstart", this.dragstart.bind(this), false);
    container.addEventListener("touchmove", this.drag.bind(this), false);
    container.addEventListener("touchend", this.dragend.bind(this), false);
  }

  dragstart(e: DragEvent): void {
    if (!this.jm.isEditable()) {
      return;
    }
    if (this.capture) {
      return;
    }
    this.activeNode = null;

    const jview = this.jm.view;
    const el = e.target as HTMLElement;
    if (el.tagName.toLowerCase() !== "jmnode") {
      return;
    }
    const nodeid = jview.getBindedNodeId(el);
    if (nodeid) {
      const node = this.jm.getNodeById(nodeid);
      if (!node.isroot) {
        this.resetShadow(el);
        this.activeNode = node;
        this.offsetX = e.clientX - el.offsetLeft;
        this.offsetY = e.clientY - el.offsetTop;
        // this.offsetX = (e.clientX || e.touches[0].clientX) - el.offsetLeft;
        // this.offset_y = (e.clientY || e.touches[0].clientY) - el.offsetTop;
        this.clientHW = Math.floor(el.clientWidth / 2);
        this.clientHH = Math.floor(el.clientHeight / 2);
        if (this.hlookupDelay !== 0) {
          window.clearTimeout(this.hlookupDelay);
        }
        if (this.hlookupTimer !== 0) {
          window.clearInterval(this.hlookupTimer);
        }
        this.hlookupDelay = window.setTimeout(() => {
          this.hlookupDelay = 0;
          this.hlookupTimer = window.setInterval(
            this.lookupCloseNode.bind(this),
            this.lookupInterval
          );
        }, this.lookupDelay);
        this.capture = true;
      }
    }
  }

  drag(e: DragEvent): void {
    if (!this.jm.isEditable()) {
      return;
    }
    if (this.capture) {
      e.preventDefault();
      this.showShadow();
      this.moved = true;
      window.getSelection().removeAllRanges();
      const px = e.clientX - this.offsetX;
      const py = e.clientY - this.offsetY;
      // const px = (e.clientX || e.touches[0].clientX) - this.offsetX;
      // const py = (e.clientY || e.touches[0].clientY) - this.offset_y;
      this.shadow.style.left = px + "px";
      this.shadow.style.top = py + "px";
      window.getSelection().removeAllRanges();
    }
  }

  dragend(): void {
    if (!this.jm.isEditable()) {
      return;
    }
    if (this.capture) {
      if (this.hlookupDelay !== 0) {
        window.clearTimeout(this.hlookupDelay);
        this.hlookupDelay = 0;
        this.clearLines();
      }
      if (this.hlookupTimer !== 0) {
        window.clearInterval(this.hlookupTimer);
        this.hlookupTimer = 0;
        this.clearLines();
      }
      if (this.moved) {
        const srcNode = this.activeNode;
        const targetNode = this.targetNode;
        const targetDirect = this.targetDirect;
        this.moveNode(srcNode, targetNode, targetDirect);
      }
      this.hideShadow();
    }
    this.moved = false;
    this.capture = false;
  }

  moveNode(
    srcNode: MindNode,
    targetNode: MindNode,
    targetDirect: Direction
  ): void {
    console.log(
      `jsMind.dgraggable.move_node: ${srcNode} ${targetNode} ${targetDirect}`
    );
    const shadowH = this.shadow.offsetTop;
    if (!!targetNode && !!srcNode && !MindNode.inherited(srcNode, targetNode)) {
      console.log(`let's move!`);
      // lookup before_node
      const siblingNodes = targetNode.children;
      let sc = siblingNodes.length;
      let node = null;
      let deltaY = Number.MAX_VALUE;
      let nodeBefore = null;
      let beforeid = BEFOREID_LAST;
      while (sc--) {
        node = siblingNodes[sc];
        if (node.direction === targetDirect && node.id !== srcNode.id) {
          const dy = node.getLocation().y - shadowH;
          if (dy > 0 && dy < deltaY) {
            deltaY = dy;
            nodeBefore = node;
            beforeid = BEFOREID_FIRST;
          }
        }
      }
      if (nodeBefore) {
        beforeid = nodeBefore.id;
      }
      console.log(
        `Calling jm.move_node: ${srcNode.id}, ${beforeid}, ${targetNode.id}, ${targetDirect}`
      );
      this.jm.moveNode(srcNode, beforeid, targetNode, targetDirect);
    }
    this.activeNode = null;
    this.targetNode = null;
    this.targetDirect = null;
  }
}
