"use client";

import Link from "next/link";
import React, { Fragment, useEffect, useState } from "react";
import { ThemeChanger } from "../../redux/action";
import { connect } from "react-redux";
import store from "@/shared/redux/store";
import Modalsearch from "../modal-search/modalsearch";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { authActions } from "@/shared/redux/actions/authActions";

const assetBase = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const Header = ({ local_varaiable, ThemeChanger }: any) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async (e?: React.MouseEvent) => {
    if (loggingOut) return;
    if (e) e.preventDefault();
    setLoggingOut(true);
    await dispatch(authActions.logout() as any);
    router.push("/auth/login/");
    setLoggingOut(false);
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const fullscreenChangeHandler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", fullscreenChangeHandler);

    return () => {
      document.removeEventListener("fullscreenchange", fullscreenChangeHandler);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        const overlay = document.querySelector("#responsive-overlay");
        if (overlay) {
          overlay.classList.remove("active");
        }
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (local_varaiable.dataToggled !== undefined) {
      document.documentElement.setAttribute(
        "data-toggled",
        local_varaiable.dataToggled
      );
    }
    if (local_varaiable.iconOverlay !== undefined) {
      document.documentElement.setAttribute(
        "data-icon-overlay",
        local_varaiable.iconOverlay
      );
    }

    const overlay = document.querySelector("#responsive-overlay");
    if (overlay && window.innerWidth >= 992) {
      overlay.classList.remove("active");
    }
  }, [local_varaiable.dataToggled, local_varaiable.iconOverlay]);

  function menuClose() {
    const theme = store.getState().theme;
    if (window.innerWidth <= 992) {
      ThemeChanger({ ...theme, dataToggled: "close" });
    }
    if (window.innerWidth >= 992) {
      ThemeChanger({
        ...theme,
        dataToggled: local_varaiable.dataToggled
          ? local_varaiable.dataToggled
          : "",
      });
    }
  }

  const toggleSidebar = () => {
    const theme = store.getState().theme;
    const isMobile = window.innerWidth < 992;

    if (isMobile) {
      if (theme.dataToggled === "close" || theme.dataToggled === "") {
        const newState = { ...theme, dataToggled: "open" };
        ThemeChanger(newState);

        setTimeout(() => {
          document.documentElement.setAttribute("data-toggled", "open");
        }, 0);

        setTimeout(() => {
          const overlay = document.querySelector("#responsive-overlay");
          if (overlay) {
            overlay.classList.add("active");
            const newOverlay = overlay.cloneNode(true);
            overlay.parentNode?.replaceChild(newOverlay, overlay);

            newOverlay.addEventListener("click", () => {
              const overlayEl = document.querySelector("#responsive-overlay");
              if (overlayEl) {
                overlayEl.classList.remove("active");
                menuClose();
              }
            });
          }
        }, 100);
      } else {
        const newState = { ...theme, dataToggled: "close" };
        ThemeChanger(newState);

        setTimeout(() => {
          document.documentElement.setAttribute("data-toggled", "close");
        }, 0);

        const overlay = document.querySelector("#responsive-overlay");
        if (overlay) {
          overlay.classList.remove("active");
        }
      }
    } else {
      let newToggledState = "";
      let newIconOverlay = "";

      if (theme.dataVerticalStyle === "overlay") {
        newToggledState =
          theme.dataToggled === "icon-overlay-close"
            ? ""
            : "icon-overlay-close";
        newIconOverlay = "";
      } else if (theme.dataVerticalStyle === "closed") {
        newToggledState =
          theme.dataToggled === "close-menu-close" ? "" : "close-menu-close";
      } else if (theme.dataVerticalStyle === "icontext") {
        newToggledState =
          theme.dataToggled === "icon-text-close" ? "" : "icon-text-close";
      } else if (theme.dataVerticalStyle === "detached") {
        newToggledState =
          theme.dataToggled === "detached-close" ? "" : "detached-close";
        newIconOverlay = "";
      } else {
        newToggledState = theme.dataToggled === "" ? "close" : "";
      }

      const newState = {
        ...theme,
        dataToggled: newToggledState,
        iconOverlay: newIconOverlay,
      };
      ThemeChanger(newState);

      setTimeout(() => {
        document.documentElement.setAttribute("data-toggled", newToggledState);
        if (newIconOverlay !== undefined) {
          document.documentElement.setAttribute(
            "data-icon-overlay",
            newIconOverlay
          );
        }
      }, 0);
    }
  };

  useEffect(() => {
    const navbar = document?.querySelector(".header");
    const navbar1 = document?.querySelector(".app-sidebar");
    const sticky: any = navbar?.clientHeight;

    function stickyFn() {
      if (window.pageYOffset >= sticky) {
        navbar?.classList.add("sticky-pin");
        navbar1?.classList.add("sticky-pin");
      } else {
        navbar?.classList.remove("sticky-pin");
        navbar1?.classList.remove("sticky-pin");
      }
    }

    window.addEventListener("scroll", stickyFn);
    window.addEventListener("DOMContentLoaded", stickyFn);

    return () => {
      window.removeEventListener("scroll", stickyFn);
      window.removeEventListener("DOMContentLoaded", stickyFn);
    };
  }, []);

  return (
    <Fragment>
      <div className="app-header">
        <nav className="main-header !h-[3.75rem]" aria-label="Global">
          <div className="main-header-container ps-[0.725rem] pe-[1rem] ">
            <div className="header-content-left">
              <div className="header-element">
                <div className="horizontal-logo">
                  <Link href="/dashboards/main/" className="header-logo">
                    <img
                      src={`${assetBase}/assets/images/brand-logos/desktop-logo.png`}
                      alt="logo"
                      className="desktop-logo"
                    />
                    <img
                      src={`${assetBase}/assets/images/brand-logos/toggle-logo.png`}
                      alt="logo"
                      className="toggle-logo"
                    />
                    <img
                      src={`${assetBase}/assets/images/brand-logos/desktop-dark.png`}
                      alt="logo"
                      className="desktop-dark"
                    />
                    <img
                      src={`${assetBase}/assets/images/brand-logos/toggle-dark.png`}
                      alt="logo"
                      className="toggle-dark"
                    />
                    <img
                      src={`${assetBase}/assets/images/brand-logos/desktop-white.png`}
                      alt="logo"
                      className="desktop-white"
                    />
                    <img
                      src={`${assetBase}/assets/images/brand-logos/toggle-white.png`}
                      alt="logo"
                      className="toggle-white"
                    />
                  </Link>
                </div>
              </div>
              <div className="header-element md:px-[0.325rem] !items-center">
                <button
                  aria-label="Toggle Sidebar"
                  className="sidemenu-toggle animated-arrow hor-toggle horizontal-navtoggle inline-flex items-center"
                  onClick={() => toggleSidebar()}
                  type="button"
                >
                  <span></span>
                </button>
              </div>
            </div>
            <div className="header-content-right">
              <div className="header-element header-fullscreen py-[1rem] md:px-[0.65rem] px-2">
                <button
                  aria-label="anchor"
                  onClick={() => toggleFullscreen()}
                  className="inline-flex flex-shrink-0 justify-center items-center gap-2  !rounded-full font-medium dark:hover:bg-black/20 dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white dark:focus:ring-white/10 dark:focus:ring-offset-white/10"
                >
                  {isFullscreen ? (
                    <i className="bx bx-exit-fullscreen full-screen-close header-link-icon"></i>
                  ) : (
                    <i className="bx bx-fullscreen full-screen-open header-link-icon"></i>
                  )}
                </button>
              </div>
              <div className="header-element md:!px-[0.65rem] px-2 hs-dropdown !items-center ti-dropdown [--placement:bottom-left]">
                <button
                  id="dropdown-profile"
                  type="button"
                  className="hs-dropdown-toggle ti-dropdown-toggle !gap-2 !p-0 flex-shrink-0 sm:me-2 me-0 !rounded-full !shadow-none text-xs align-middle !border-0 !shadow-transparent "
                >
                  <img
                    className="inline-block rounded-full "
                    src={`${assetBase}/assets/images/faces/9.jpg`}
                    width="32"
                    height="32"
                    alt="User profile"
                  />
                </button>
                <div className="md:block hidden dropdown-profile">
                  <p className="font-semibold mb-0 leading-none text-[#536485] text-[0.813rem] ">
                    Admin
                  </p>
                </div>
                <div
                  className="hs-dropdown-menu ti-dropdown-menu !-mt-3 border-0 w-[11rem] !p-0 border-defaultborder hidden main-header-dropdown  pt-0 overflow-hidden header-profile-dropdown dropdown-menu-end"
                  aria-labelledby="dropdown-profile"
                >
                  <ul className="text-defaulttextcolor font-medium dark:text-[#8c9097] dark:text-white/50">
                    <li>
                      <Link
                        onClick={handleLogout}
                        className="w-full ti-dropdown-item !text-[0.8125rem] !p-[0.65rem] !gap-x-0 !inline-flex cursor-pointer"
                        href="#!"
                      >
                        <i className="ti ti-logout text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>
                        {loggingOut ? "Logging out..." : "Logout"}
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>
      <Modalsearch />
    </Fragment>
  );
};

const mapStateToProps = (state: any) => ({
  local_varaiable: state.theme,
});

export default connect(mapStateToProps, { ThemeChanger })(Header);
