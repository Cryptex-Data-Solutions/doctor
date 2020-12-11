

export interface Menu {
  [name: string]: MenuType;
}

export interface MenuType {
  /**
   * Type of menu where the items will be added. Default is "QuickLaunch".
   */
  items: MenuItem[];
}

export interface MenuItem {
  url: string;
  id: string;
  
  name?: string;
  weight?: number;
  parent?: string;

  items?: MenuItem[];
}