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
  {
    icon: <i className="bx bx-refresh side-menu__icon"></i>,
    title: "Sync",
    type: "link",
    active: false,
    selected: false,
    path: "/sync",
  },
  {
    icon: <i className="bx bx-closet side-menu__icon"></i>,
    title: "Fabric Management",
    type: "sub",
    active: false,
    selected: false,
    path: "/store",
    children: [
      {
        icon: <i className="bx bx-cart side-menu__icon"></i>,
        title: "Purchase Management",
        type: "sub",
        active: false,
        selected: false,
        path: "/store/purchase",
        children: [
          { icon: <i className="bx bx-file side-menu__icon"></i>, title: "All PO", type: "link", path: "/store/purchase-orders", active: false, selected: false },
          { icon: <i className="bx bx-download side-menu__icon"></i>, title: "PO received", type: "link", path: "/store/po-received", active: false, selected: false },
          { icon: <i className="bx bx-edit side-menu__icon"></i>, title: "Drafts PO", type: "link", path: "/store/purchase-orders/drafts", active: false, selected: false },
          { icon: <i className="bx bx-undo side-menu__icon"></i>, title: "PO return", type: "link", path: "/store/vendor-returns", active: false, selected: false },
          { icon: <i className="bx bx-receipt side-menu__icon"></i>, title: "PO return challan", type: "link", path: "/store/return-challans", active: false, selected: false },
          { icon: <i className="bx bx-history side-menu__icon"></i>, title: "GRN history", type: "link", path: "/store/grn", active: false, selected: false },
          { icon: <i className="bx bx-check-shield side-menu__icon"></i>, title: "Fabric QC", type: "link", path: "/quality/fabric", active: false, selected: false },
        ],
      },
      { icon: <i className="bx bx-export side-menu__icon"></i>, title: "Fabric issue", type: "link", path: "/store/issue", active: false, selected: false },
      { icon: <i className="bx bx-revision side-menu__icon"></i>, title: "Fabric return", type: "link", path: "/store/fabric-return", active: false, selected: false },
      { icon: <i className="bx bx-archive side-menu__icon"></i>, title: "Fabric storage", type: "link", path: "/store/racks", active: false, selected: false },
      {
        icon: <i className="bx bx-bar-chart-alt-2 side-menu__icon"></i>,
        title: "Analytics & Reports",
        type: "sub",
        active: false,
        selected: false,
        path: "/store/reports",
        children: [
          { icon: <i className="bx bx-pulse side-menu__icon"></i>, title: "Live inventory", type: "link", path: "/store/reports/live-inventory", active: false, selected: false },
          { icon: <i className="bx bx-table side-menu__icon"></i>, title: "Fabric stock report", type: "link", path: "/store/reports/stock", active: false, selected: false },
          { icon: <i className="bx bx-line-chart side-menu__icon"></i>, title: "PO analytics", type: "link", path: "/store/reports/po", active: false, selected: false },
          { icon: <i className="bx bx-pie-chart-alt side-menu__icon"></i>, title: "Fabric analytics", type: "link", path: "/store/reports/fabric", active: false, selected: false },
        ],
      },
    ],
  },
  {
    icon: <i className="bx bx-cog side-menu__icon"></i>,
    title: "Production",
    type: "sub",
    active: false,
    selected: false,
    path: "/production",
    children: [
      { title: "Orders", type: "link", path: "/production/orders", active: false, selected: false },
      { title: "Cut", type: "link", path: "/production/floor/cut", active: false, selected: false },
      { title: "Selvage", type: "link", path: "/production/floor/selvage", active: false, selected: false },
      { title: "Half moon", type: "link", path: "/production/floor/half-moon", active: false, selected: false },
      { title: "Vertical hem", type: "link", path: "/production/floor/vertical-hem", active: false, selected: false },
      { title: "Bundle", type: "link", path: "/production/floor/bundle", active: false, selected: false },
      { title: "Horizontal hem", type: "link", path: "/production/floor/horizontal-hem", active: false, selected: false },
      { title: "Thread cut", type: "link", path: "/production/floor/thread-cut", active: false, selected: false },
      { title: "Iron", type: "link", path: "/production/floor/iron", active: false, selected: false },
      { title: "Route split", type: "link", path: "/production/floor/route-split", active: false, selected: false },
      { title: "Embroidery", type: "link", path: "/production/floor/embroidery", active: false, selected: false },
      { title: "Sticker", type: "link", path: "/production/floor/sticker", active: false, selected: false },
    ],
  },
  {
    icon: <i className="bx bx-check-shield side-menu__icon"></i>,
    title: "Quality",
    type: "sub",
    active: false,
    selected: false,
    path: "/quality",
    children: [
      { title: "Floor checks", type: "link", path: "/quality/floor", active: false, selected: false },
      { title: "Grades", type: "link", path: "/quality/grades", active: false, selected: false },
    ],
  },
  {
    icon: <i className="bx bx-package side-menu__icon"></i>,
    title: "Warehouse",
    type: "sub",
    active: false,
    selected: false,
    path: "/warehouse",
    children: [
      { title: "Client orders", type: "link", path: "/warehouse/orders", active: false, selected: false },
      { title: "Packing", type: "link", path: "/warehouse/packing", active: false, selected: false },
      { title: "Boxes", type: "link", path: "/warehouse/boxes", active: false, selected: false },
      { title: "Dispatch", type: "link", path: "/warehouse/dispatch", active: false, selected: false },
    ],
  },
  {
    icon: <i className="bx bx-receipt side-menu__icon"></i>,
    title: "Accounts",
    type: "sub",
    active: false,
    selected: false,
    path: "/accounts",
    children: [
      { title: "Invoices", type: "link", path: "/accounts/invoices", active: false, selected: false },
    ],
  },
  {
    icon: <i className="bx bx-bar-chart side-menu__icon"></i>,
    title: "Reports",
    type: "link",
    active: false,
    selected: false,
    path: "/reports",
  },
  {
    icon: <i className="bx bx-git-branch side-menu__icon"></i>,
    title: "Revision review",
    type: "link",
    active: false,
    selected: false,
    path: "/versioning/review",
  },
];

export const useMenuItems = () => {
  const filteredItems = useNavigationMenu(BaseMenuItems);
  return filteredItems || BaseMenuItems;
};

export const MenuItems = BaseMenuItems;
