import '../global.css';
import { User } from '../js/user';

/** 
 * @param {{
 *  user: User
 * }}
*/
const ImportFiles = ({user}) => {
    return (
        <div>
            <div>
                Select files you wish to import (&lt;2GB per file): <input type="file" multiple={true} />
            </div>
            <div>
                Which file service(s) would you like to import these files to:
                <select multiple={true}>
                    {user.tagServices.map(tagService => (
                        <option value={tagService.id}>
                            {tagService.name}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <input type="submit" value="Submit" />
            </div>
        </div>
    );
};

export default ImportFiles;

export const MODAL_NAME = "import-files";
export const MODAL_DISPLAY_NAME = "Import Files";