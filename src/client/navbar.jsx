import './global.css';
import ImportFilesFromHydrus from './modal/modals/import-files-from-hydrus.jsx';
import ChangeTagToMetricModal from './modal/modals/change-tag-to-metric.jsx';
import { FILE_SEARCH_PAGE_NAME, FILE_SEARCH_PAGE_DEFAULT_DISPLAY_NAME } from './page/pages/file-search-page.jsx';
import ImportMappingsFromBackup from './modal/modals/import-mappings-from-backup.jsx';
import CreateLocalMetricService from './modal/modals/crud-create-local-metric-service.jsx';
import UpdateLocalMetricService from './modal/modals/crud-update-local-metric-service.jsx';
import CreateLocalTagService from './modal/modals/crud-create-local-tag-service.jsx';
import UpdateLocalTagService from './modal/modals/crud-update-local-tag-service.jsx';
import CreateLocalTaggableService from './modal/modals/crud-create-local-taggable-service.jsx';
import UpdateLocalTaggableService from './modal/modals/crud-update-local-taggable-service.jsx';
import CreateLocalMetric from './modal/modals/crud-create-local-metric.jsx';
import UpdateLocalMetric from './modal/modals/crud-update-local-metric.jsx';
import CreateLocalDownloaderService from './modal/modals/crud-create-local-downloader-service.jsx';
import UpdateLocalDownloaderService from './modal/modals/crud-update-local-downloader-service.jsx';
import { DUPLICATES_PROCESSING_PAGE_DEFAULT_DISPLAY_NAME, DUPLICATES_PROCESSING_PAGE_NAME } from './page/pages/duplicates-page.jsx';
import {Page, Pages} from './page/pages.js'
import { Modals } from './modal/modals.js';
import { ReferenceableReact } from './js/client-util.js';
import CreateURLParser from './modal/modals/crud-create-url-parser.jsx';
import UpdateURLParser from './modal/modals/crud-update-url-parser.jsx';
import { DOWNLOADER_PAGE_DEFAULT_DISPLAY_NAME, DOWNLOADER_PAGE_NAME } from './page/pages/downloader-page.jsx';

const MENUS = {
    File: ReferenceableReact(),
    Pages: ReferenceableReact(),
    Tags: ReferenceableReact(),
    Taggables: ReferenceableReact(),
    Metrics: ReferenceableReact(),
    Parsers: ReferenceableReact()
};

const Navbar = () => {
    const setMenuOpened = (menuToChange, open) => {
        for (const menu of Object.values(MENUS)) {
            menu.dom.style.display = "none";
        }
        if (menuToChange === null) {
            return;
        }

        menuToChange.dom.style.display = open ? "block" : "none";
    }
    const toggleMenuOpened = (menu) => {
        setMenuOpened(menu, menu.dom.style.display === "none" ? true : false);
    };

    return (
        <nav className="navbar">
            <div className="topbar-dropdown">
                <div className="topbar-dropdown-title" onClick={() => toggleMenuOpened(MENUS.File)}>File</div>
                {MENUS.File.react(<div className="topbar-dropdown-options" style={{display: "none"}}>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        Modals.Global().pushModal(ImportFilesFromHydrus());
                    }}>Import files from Hydrus</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        Modals.Global().pushModal(ImportMappingsFromBackup());
                    }}>Import mappings from backup</div>
                    <a href="/api/get/backup" download="garo-backup.json"><div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                    }}>Download backup</div></a>
                </div>)}
            </div>
            <div className="topbar-dropdown">
                <div className="topbar-dropdown-title" onClick={() => toggleMenuOpened(MENUS.Pages)}>Pages</div>
                {MENUS.Pages.react(<div className="topbar-dropdown-options" style={{display: "none"}}>
                    <div className="topbar-dropdown-option" onClick={() => {
                        const page = new Page(FILE_SEARCH_PAGE_NAME, FILE_SEARCH_PAGE_DEFAULT_DISPLAY_NAME);
                        Pages.Global().addPage(page);
                        setMenuOpened(null);
                    }}>New file search page</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        const page = new Page(DOWNLOADER_PAGE_NAME, DOWNLOADER_PAGE_DEFAULT_DISPLAY_NAME);
                        Pages.Global().addPage(page);
                        setMenuOpened(null);
                    }}>New downloader page</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        const page = new Page(DUPLICATES_PROCESSING_PAGE_NAME, DUPLICATES_PROCESSING_PAGE_DEFAULT_DISPLAY_NAME);
                        Pages.Global().addPage(page);
                        setMenuOpened(null);
                    }}>New duplicates processing page</div>
                </div>)}
            </div>
            <div className="topbar-dropdown">
                <div className="topbar-dropdown-title" onClick={() => toggleMenuOpened(MENUS.Tags)}>Tags</div>
                {MENUS.Tags.react(<div className="topbar-dropdown-options" style={{display: "none"}}>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        Modals.Global().pushModal(CreateLocalTagService());
                    }}>Create new tag service</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        Modals.Global().pushModal(UpdateLocalTagService());
                    }}>Update/delete existing tag service</div>
                </div>)}
            </div>
            <div className="topbar-dropdown">
                <div className="topbar-dropdown-title" onClick={() => toggleMenuOpened(MENUS.Taggables)}>Taggables</div>
                {MENUS.Taggables.react(<div className="topbar-dropdown-options" style={{display: "none"}}>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        Modals.Global().pushModal(CreateLocalTaggableService());
                    }}>Create new taggable service</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        Modals.Global().pushModal(UpdateLocalTaggableService());
                    }}>Update/delete existing taggable service</div>
                </div>)}
            </div>
            <div className="topbar-dropdown">
                <div className="topbar-dropdown-title" onClick={() => toggleMenuOpened(MENUS.Metrics)}>Metrics</div>
                {MENUS.Metrics.react(<div className="topbar-dropdown-options" style={{display: "none"}}>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        Modals.Global().pushModal(CreateLocalMetricService());
                    }}>Create new metric service</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        Modals.Global().pushModal(UpdateLocalMetricService());
                    }}>Update/delete existing metric service</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        Modals.Global().pushModal(CreateLocalMetric());
                    }}>Create new metric</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        Modals.Global().pushModal(UpdateLocalMetric());
                    }}>Update/delete existing metric</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        Modals.Global().pushModal(ChangeTagToMetricModal());
                    }}>Change tag to metric</div>
                </div>)}
            </div>
            <div className="topbar-dropdown">
                <div className="topbar-dropdown-title" onClick={() => toggleMenuOpened(MENUS.Parsers)}>Parsers</div>
                {MENUS.Parsers.react(<div className="topbar-dropdown-options" style={{display: "none"}}>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        Modals.Global().pushModal(CreateLocalDownloaderService());
                    }}>Create new downloader service</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        Modals.Global().pushModal(UpdateLocalDownloaderService());
                    }}>Update/delete existing downloader service</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        Modals.Global().pushModal(CreateURLParser());
                    }}>Create new URL parser</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        setMenuOpened(null);
                        Modals.Global().pushModal(UpdateURLParser());
                    }}>Update/delete existing URL parser</div>
                </div>)}
            </div>
        </nav>
    );
};

export default Navbar;