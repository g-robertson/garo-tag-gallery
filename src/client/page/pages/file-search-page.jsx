import TagsSelector from '../../components/tags-selector.jsx';
import '../../global.css';
import { fbjsonParse } from '../../js/client-util.js';
import { User } from '../js/user.js';

/** @import {SearchObject} from "../../components/tags-selector.jsx" */

/** 
 * @param {{
 *  user: User
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 * }}
*/
const FileSearchPage = ({user, pushModal}) => {

    return (
        <div style={{width: "100%", height: "100%"}}>
            <div style={{flex: 1, height: "100%"}}>
                <TagsSelector user={user} pushModal={pushModal} onSearchChanged={async (searchObjects) => {
                    const searchQuery = searchObjects.map(searchObject => searchObject.flat(Infinity).map(searchTag => ({
                        Local_Tag_ID: searchTag.localTagID,
                        exclude: searchTag.exclude
                    })));

                    const response = await fetch("/api/post/search-taggables", {
                        body: JSON.stringify({
                            searchQuery
                        }),
                        headers: {
                          "Content-Type": "application/json",
                        },
                        method: "POST"
                    });

                    console.log(await fbjsonParse(response));
                }} />
            </div>
            <div style={{width: "auto", flex: 3, height: "100%"}}>
                Files portion
            </div>
        </div>
    );
};

export default FileSearchPage;

export const PAGE_NAME = "file-search-page";
export const PAGE_DEFAULT_DISPLAY_NAME = "New file search page";