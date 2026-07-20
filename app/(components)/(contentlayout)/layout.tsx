"use client";

import PrelineScript from "@/app/PrelineScript";
import Footer from "@/shared/layout-components/footer/footer";
import Header from "@/shared/layout-components/header/header";
import Sidebar from "@/shared/layout-components/sidebar/sidebar";
import Switcher from "@/shared/layout-components/switcher/switcher";
import { NavigationProvider } from "@/shared/contextapi/navigationContext";
import RequireAuth from "@/shared/components/auth/RequireAuth";
import { ThemeChanger } from "@/shared/redux/action";
import store from "@/shared/redux/store";
import { Fragment, Suspense } from "react";
import { connect } from "react-redux";

const Layout = ({ children }: any) => {
  const Bodyclickk = () => {
    const theme = store.getState().theme;
    if (window.innerWidth > 992) {
      if (theme.iconOverlay === "open") {
        ThemeChanger({ ...theme, iconOverlay: "" });
      }
    }
  };

  return (
    <Fragment>
      <RequireAuth>
      <NavigationProvider>
        <Switcher />
        <div className="page">
          <Header />
          <Suspense
            fallback={
              <aside
                className="app-sidebar"
                id="sidebar"
                aria-busy="true"
                aria-label="Loading navigation"
              >
                <div className="main-sidebar-header" />
                <div className="main-sidebar min-h-[200px]" />
              </aside>
            }
          >
            <Sidebar />
          </Suspense>
          <div className="content">
            <div
              className="main-content"
              style={{ paddingLeft: 0, paddingRight: 0 }}
              onClick={Bodyclickk}
            >
              {children}
            </div>
          </div>
          <Footer />
        </div>
        <PrelineScript />
      </NavigationProvider>
      </RequireAuth>
    </Fragment>
  );
};

const mapStateToProps = (state: any) => ({
  local_varaiable: state.theme,
});

export default connect(mapStateToProps, { ThemeChanger })(Layout);
