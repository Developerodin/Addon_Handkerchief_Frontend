import React from "react";
import { useNavigationMenu } from "@/shared/hooks/useNavigationMenu";

const DashboardIcon = <i className="bx bx-home side-menu__icon"></i>;
const CatalogIcon = <i className="bx bx-package side-menu__icon"></i>;
const ItemsIcon = <i className="bx bx-box side-menu__icon"></i>;
const CategoriesIcon = <i className="bx bx-category side-menu__icon"></i>;
const MaterialIcon = <i className="bx bx-layer side-menu__icon"></i>;
const ProcessIcon = <i className="bx bx-cog side-menu__icon"></i>;
const AttributeIcon = <i className="bx bx-list-ul side-menu__icon"></i>;
const StyleCodeIcon = <i className="bx bx-purchase-tag side-menu__icon"></i>;
const UsersIcon = (
  <i
    className="ri ri-user-line side-menu__icon"
    style={{ marginTop: "-10px" }}
  ></i>
);

const BaseMenuItems: any = [
  {
    menutitle: "MAIN",
  },
  {
    icon: DashboardIcon,
    title: "Dashboard",
    type: "link",
    active: false,
    selected: false,
    path: "/dashboards/main",
  },
  {
    icon: CatalogIcon,
    title: "Master Catalog",
    type: "sub",
    active: false,
    selected: false,
    path: "/catalog",
    children: [
      {
        icon: ItemsIcon,
        path: "/catalog/items",
        type: "link",
        active: false,
        selected: false,
        title: "Items",
      },
      {
        icon: CategoriesIcon,
        path: "/catalog/categories",
        type: "link",
        active: false,
        selected: false,
        title: "Categories",
      },
      {
        icon: MaterialIcon,
        path: "/catalog/raw-material",
        type: "link",
        active: false,
        selected: false,
        title: "Raw Material",
      },
      {
        icon: ProcessIcon,
        path: "/catalog/processes",
        type: "link",
        active: false,
        selected: false,
        title: "Processes",
      },
      {
        icon: AttributeIcon,
        path: "/catalog/attributes",
        type: "link",
        active: false,
        selected: false,
        title: "Attributes",
      },
      {
        icon: StyleCodeIcon,
        path: "/catalog/style-codes",
        type: "link",
        active: false,
        selected: false,
        title: "Style Codes",
      },
    ],
  },
  {
    icon: UsersIcon,
    title: "Users",
    type: "link",
    active: false,
    selected: false,
    path: "/users",
  },
];

export const useMenuItems = () => {
  const filteredItems = useNavigationMenu(BaseMenuItems);
  return filteredItems || BaseMenuItems;
};

export const MenuItems = BaseMenuItems;
