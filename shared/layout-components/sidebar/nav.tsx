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
const SupplierIcon = <i className="bx bx-store side-menu__icon"></i>;
const FabricIcon = <i className="bx bx-grid-alt side-menu__icon"></i>;
const MachineIcon = <i className="bx bx-cog side-menu__icon"></i>;
const WorkerIcon = <i className="bx bx-user side-menu__icon"></i>;
const RackIcon = <i className="bx bx-layer side-menu__icon"></i>;
const ContainerIcon = <i className="bx bx-box side-menu__icon"></i>;
const LabelIcon = <i className="bx bx-printer side-menu__icon"></i>;
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
        title: "Category",
      },
      {
        icon: StyleCodeIcon,
        path: "/catalog/style-codes",
        type: "link",
        active: false,
        selected: false,
        title: "Style codes",
      },
      {
        icon: FabricIcon,
        title: "Fabric",
        type: "sub",
        active: false,
        selected: false,
        path: "/catalog/fabric-lookups",
        children: [
          {
            icon: FabricIcon,
            path: "/catalog/fabric",
            type: "link",
            active: false,
            selected: false,
            title: "Fabric Catalog",
          },
          {
            icon: FabricIcon,
            path: "/catalog/fabric-type",
            type: "link",
            active: false,
            selected: false,
            title: "Fabric Type",
          },
          {
            icon: FabricIcon,
            path: "/catalog/fabric-color",
            type: "link",
            active: false,
            selected: false,
            title: "Fabric Color",
          },
          {
            icon: FabricIcon,
            path: "/catalog/fabric-quality",
            type: "link",
            active: false,
            selected: false,
            title: "Fabric Quality",
          },
          {
            icon: FabricIcon,
            path: "/catalog/fabric-yarn",
            type: "link",
            active: false,
            selected: false,
            title: "Yarn",
          },
          {
            icon: FabricIcon,
            path: "/catalog/fabric-count",
            type: "link",
            active: false,
            selected: false,
            title: "Count",
          },
          {
            icon: FabricIcon,
            path: "/catalog/fabric-measurement",
            type: "link",
            active: false,
            selected: false,
            title: "Measurement",
          },
        ],
      },
      {
        icon: SupplierIcon,
        path: "/catalog/fabric-suppliers",
        type: "link",
        active: false,
        selected: false,
        title: "Fabric Suppliers",
      },
      {
        icon: MaterialIcon,
        path: "/catalog/raw-material",
        type: "link",
        active: false,
        selected: false,
        title: "Packaging materials",
      },
      {
        icon: ProcessIcon,
        path: "/catalog/processes",
        type: "link",
        active: false,
        selected: false,
        title: "Process Master",
      },
      {
        icon: AttributeIcon,
        path: "/catalog/attributes",
        type: "link",
        active: false,
        selected: false,
        title: "Attributes Master",
      },
      {
        icon: MachineIcon,
        path: "/catalog/machines",
        type: "link",
        active: false,
        selected: false,
        title: "Machines & Configuration",
      },
      {
        icon: WorkerIcon,
        path: "/catalog/workers",
        type: "link",
        active: false,
        selected: false,
        title: "Workers / Operators",
      },
      {
        icon: RackIcon,
        path: "/catalog/storage-racks",
        type: "link",
        active: false,
        selected: false,
        title: "Storage Racks",
      },
      {
        icon: ContainerIcon,
        path: "/catalog/containers",
        type: "link",
        active: false,
        selected: false,
        title: "Containers",
      },
      {
        icon: LabelIcon,
        path: "/catalog/label-templates",
        type: "link",
        active: false,
        selected: false,
        title: "Label Templates & Device Registry",
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
