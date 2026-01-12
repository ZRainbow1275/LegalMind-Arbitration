/**
 * 选中指示系统数据模型
 * 用于显示其他协作者正在编辑的节点
 */

/**
 * 用户选中状态
 */
export interface UserSelection {
  userId: string;
  userName: string;
  userColor: string;
  selectedNodeIds: string[];
  lastUpdate: Date;
}

/**
 * 选中更新参数
 */
export interface UpdateSelectionParams {
  userId: string;
  selectedNodeIds: string[];
}

