import Mind from "../Mind";

export default interface MindmapImporter {
  get_mind(source: any, id: number): Mind;
}