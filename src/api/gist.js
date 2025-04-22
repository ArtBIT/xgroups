export const GistAPI = (function () {
  const GIST_API_URL = "https://api.github.com/gists";
  const getToken = () => GM_getValue("xgroups_gist_token", "");
  const getGistId = () => GM_getValue("xgroups_gist_id", "");

  const headers = () => ({
    Accept: "application/vnd.github.v3+json",
    Authorization: `token ${getToken()}`,
    "Content-Type": "application/json",
  });

  /**
   * Creates a new Gist with initial data.
   * @param {Object} data - Data to store (groups and userGroups)
   * @returns {Promise<string>} Gist ID
   */
  const createGist = async (data) => {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        url: GIST_API_URL,
        method: "POST",
        headers: headers(),
        nocache: true,
        data: JSON.stringify({
          description: "X.com User Group Tagger Data",
          public: false,
          files: {
            "xgroups_data.json": {
              content: JSON.stringify(data, null, 2),
            },
          },
        }),
        onload: (raw) => {
          let response;
          try {
            response = JSON.parse(raw.responseText);
          } catch (e) {
            reject(e);
          }
          if (raw.status !== 200) reject(new Error("Failed to create Gist"));
          const { id } = response;
          GM_setValue("xgroups_gist_id", id);
          return resolve(id);
        },
      });
    });
  };

  /**
   * Reads data from a Gist.
   * @param {string} gistId - Gist ID
   * @returns {Promise<Object>} Data from Gist
   */
  const readGist = async (gistId) => {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        url: `${GIST_API_URL}/${gistId}`,
        headers: headers(),
        nocache: true,
        onload: (raw) => {
          let response;
          try {
            response = JSON.parse(raw.responseText);
          } catch (e) {
            reject(e);
          }
          const { files } = response;
          resolve(JSON.parse(files["xgroups_data.json"].content));
        },
      });
    });
  };

  /**
   * Updates a Gist with new data.
   * @param {string} gistId - Gist ID
   * @param {Object} data - Data to store
   * @returns {Promise<void>}
   */
  const updateGist = async (gistId, data) => {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        url: `${GIST_API_URL}/${gistId}`,
        method: "PATCH",
        headers: headers(),
        nocache: true,
        data: JSON.stringify({
          files: {
            "xgroups_data.json": {
              content: JSON.stringify(data, null, 2),
            },
          },
        }),
        onload: (raw) => {
          let response;
          try {
            response = JSON.parse(raw.responseText);
          } catch (e) {
            reject(e);
          }

          if (raw.status !== 200) {
            reject(new Error("Failed to update Gist"));
          }

          resolve(gistId);
        },
      });
    });
  };

  return { createGist, readGist, updateGist, getToken, getGistId };
})();

export default GistAPI;
