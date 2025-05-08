import { useState } from 'react';
import './global.css';
import { MODAL_NAME as IMPORT_FILES_MODAL_NAME } from './import-files/import-files';

const FILE_MENU = "file";
const FILE_MENU_2 = "file2";


const Navbar = ({pushModal}) => {
    /** @type [string | null, (menuOpened: string | null)=>void] */
    const [menuOpened, setMenuOpened] = useState(null);

    const toggleMenuOpened = (menu) => {
        setMenuOpened(menuOpened === menu ? null : menu);
    };

    return (
        <nav className="navbar">
            <div className="topbar-dropdown">
                <div className="topbar-dropdown-title" onClick={() => toggleMenuOpened(FILE_MENU)}>File</div>
                <div className="topbar-dropdown-options" style={{display: menuOpened === FILE_MENU ? "block" : "none"}}>
                    <div className="topbar-dropdown-option" onClick={() => {
                        pushModal(IMPORT_FILES_MODAL_NAME)
                    }}>Import files</div>
                </div>
            </div>
            
            <div className="topbar-dropdown">
                <div className="topbar-dropdown-title" onClick={() => toggleMenuOpened(FILE_MENU_2)}>File2</div>
                <div className="topbar-dropdown-options" style={{display: menuOpened === FILE_MENU_2 ? "block" : "none"}}>
                    <div className="topbar-dropdown-option" onClick={() => {
                        pushModal(IMPORT_FILES_MODAL_NAME)
                    }}>Import files2</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        pushModal(IMPORT_FILES_MODAL_NAME)
                    }}>Import files3</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        pushModal(IMPORT_FILES_MODAL_NAME)
                    }}>Import files4</div>
                    <div className="topbar-dropdown-option" onClick={() => {
                        pushModal(IMPORT_FILES_MODAL_NAME)
                    }}>Import files5</div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;