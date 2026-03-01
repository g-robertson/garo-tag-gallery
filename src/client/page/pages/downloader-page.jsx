import '../../global.css';

import { Page} from "../pages.js";
import { PersistentState, State, ConstState } from '../../js/state.js';
import { executeFunctions, ReferenceableReact } from '../../js/client-util.js';
import { FetchCache } from '../../js/fetch-cache.js';
import { User } from '../../js/user.js';
import LazyTextObjectSelector from '../../components/lazy-text-object-selector.jsx';
import NumericInput from '../../components/numeric-input.jsx';
import AdjustableWidgets, { EXPANSION_AREA } from '../../components/adjustable-widgets.jsx';
import { DEFAULT_LOCAL_URL_PARSERS } from '../../js/defaults.js';
import OptionedLazyThumbnailGallery from '../../components/optioned-lazy-thumbnail-gallery.jsx';
import HoverInfo from '../../components/hover-info.jsx';

/** 
 * @param {{
 *  page: Page
 * }}
*/
const DownloaderPageElement = ({page}) => {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const URLClassifierSelect = ReferenceableReact();

    const fileCountLimitState = new State(2000);
    const clientSearchQueryState = new State(null, {name: "FileSearchPage.clientSearchQueryState"});
    const searchTaggablesResultState = FetchCache.Global().searchTaggablesConstState(
        clientSearchQueryState,
        ConstState.instance("Taggable"),
        ConstState.instance("Taggable_ID"),
        User.Global().localTagServicesAvailableState(addToCleanup),
        addToCleanup
    );
    const [taggableCursorConstState, taggableIDsConstState] = searchTaggablesResultState.asAtomicTransforms([
        taggablesResult => taggablesResult.cursor,
        taggablesResult => taggablesResult.result
    ], addToCleanup, {name: "FileSearchPage.(taggableCursorConstState|taggableIDsConstState)"});

    const onAdd = () => {
        return () => executeFunctions(addToCleanup);
    };

    return (
        <div style={{width: "100%", height: "100%"}} onAdd={onAdd}>
            <AdjustableWidgets
                persistentState={page.persistentState.registerState("adjustableWidgetsDownloaderLHSRHS", new PersistentState(), {addToCleanup})}
                flexDirection="row"
                widgets={[
                    {
                        element: <div style={{width: "100%", height: "100%", margin: 4}}>
                            <AdjustableWidgets
                                persistentState={page.persistentState.registerState("adjustableWidgetsDownloaderLHS", new PersistentState(), {addToCleanup})}
                                flexDirection="column"
                                widgets={[
                                    {
                                        element: (<div style={{width: "100%", flexDirection: "column", marginBottom: 4}}>
                                            <div style={{marginTop: 4}}><div>Enter a URL: </div><div style={{flex: 1}}><input style={{width: "100%", marginLeft: 4}} type="text" /></div></div>
                                            <div style={{marginTop: 4}}>Or use a URL generator: <input style={{marginLeft: 4}} type="button" value="Generate URL" /></div>
                                            <div style={{marginTop: 4}}>URL Classifier to use: {URLClassifierSelect.react(<select>
                                                {DEFAULT_LOCAL_URL_PARSERS.map(urlParser => (
                                                    <option value={urlParser.Local_URL_Parser_ID}>{urlParser.Local_URL_Parser_Name}</option>
                                                ))}
                                            </select>)}</div>
                                            <div style={{marginTop: 2, borderBottom: "1px solid white"}}></div>
                                            <div style={{marginTop: 4}}>
                                                <input type="button" value="Download from URL" onClick={async () => {
                                                    await launchDownloader({

                                                    });
                                                }}/>
                                                <HoverInfo children={<input style={{marginLeft: 4}} type="button" value="Watch URL" />} hoverText="Creates a downloader that will re-check periodically, stopping once it reaches images it has seen before" />
                                            </div>
                                            <div style={{marginTop: 4}}>
                                                <HoverInfo children="Start downloader paused" hoverText="Use this if you want to modify some parameter of the downloader before it begins, for example: watcher re-check times" />:<input type="checkbox" />
                                            </div>
                                        </div>),
                                        defaultFlex: 0
                                    },
                                    {
                                        element: (<LazyTextObjectSelector
                                            textObjectsConstState={ConstState.instance(["downloader1 - 123 items - Done", "downloader2 - 123 items - Done", "downloader3 - 123 items - Done"])}
                                            customItemComponent={({realizedValue}) => <>{realizedValue}</>}
                                            multiHighlight={true}
                                            multiSelect={false}
                                            styleSelectedValues={true}
                                        />),
                                        defaultFlex: 1,
                                        minFlex: 0.7
                                    },
                                    EXPANSION_AREA,
                                    {
                                        element: (<div style={{flexDirection: "column"}}>
                                            <div style={{marginTop: 4}}>File count limit: <span style={{marginLeft: 4}}><NumericInput selectedNumberState={fileCountLimitState} minValue={1} maxValue={Infinity} /></span></div>
                                            <div style={{marginTop: 4}}><input type="button" value="Pause/unpause selected query" /></div>
                                            <div style={{marginTop: 4}}><input type="button" value="View selected query's log" /></div>
                                            <div style={{marginTop: 4}}><input type="button" value="Retry selected query's failed items" /></div>
                                        </div>),
                                        defaultFlex: 0
                                    }
                                ]}
                                defaultAfterFlex={4}
                            />
                        </div>,
                        defaultFlex: 1,
                        minFlex: 0.3
                    },
                    {
                        element: <OptionedLazyThumbnailGallery
                            taggableCursorConstState={taggableCursorConstState}
                            taggableIDsConstState={taggableIDsConstState}
                        />,
                        defaultFlex: 3,
                        minFlex: 1
                    }
                ]}
            />
        </div>
    );
};

export default DownloaderPageElement;
export const DOWNLOADER_PAGE_NAME = "downloader-page";
export const DOWNLOADER_PAGE_DEFAULT_DISPLAY_NAME = "New downloader page";