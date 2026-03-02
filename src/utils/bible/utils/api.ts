// CHAPTER API
// INFO: This is a GET request which will return the chapters.json data
// IMPLEMENTATION: 
// We will use the "books" array to get the chapters of the Bible and displays it in the User Interface.
// We will use the following property for the Chapter name: "human", example:  "human": "Genesis",
// We will use the following property for the Chapter number: "human", example:  "human": "1",
// We will use the following property for the usfm params value: "usfm", example:  "usfm": "GEN.1",
export const chapterApiUrl = (versionId: string | number) => `https://www.bible.com/api/bible/version/${versionId}`;

// VERSIONS API
// INFO: This is a GET request which will return the versions.json data
// IMPLEMENTATION: 
// We will use the "versions" array to get the versions of the Bible and displays it in the User Interface.
// We will use the following property for the Version name: "local_abbreviation", example:  "local_abbreviation": "AMP",
// We will use the following property for the usfm params value: "abbreviation", example:  "abbreviation": "AMP",
export const versionsApiUrl = (langCode: string) => `https://www.bible.com/api/bible/versions?language_tag=${langCode}&type=all`;

// CONFIGURATION API
// INFO: This is a GET request which will return the configuration.json data
// IMPLEMENTATION: 
// We will use the "default_versions" array to get the languages of the Bible and displays it in the User Interface.
// We will use the following property for the Language name: "local_name", example:  "local_name": " ᐃᓕᓖᒧᐎᓐ",
// When a language will be selected, example: Francais, we will use the property: "iso_639_3", example: "iso_639_3": "fra"
// This property will be used to construct the new versions api url, example: https://www.bible.com/api/bible/versions?language_tag=fra&type=all
// This will update the versions User Interface data, allowing users to now select the versions for the selected language.
export const configurationApiUrl = 'https://www.bible.com/api/bible/configuration';


// -----------------------------------------------------------------------

// Example: Get Genesis 1
// URL:  https://www.bible.com/_next/data/X1NJ9qQJf_991mHG-VJjR/en/bible/1/GEN.1.KJV.json?versionId=1&usfm=GEN.1.KJV
// NOTICE: The versionId and usfm params are required
// This will return such a response: response.json ( see demo folder for the response.json file ).
// And we will use the property: "chapterInfo" > "content" to get the chapter content.
// We will then have to process the HTML. ( see demo folder for the processed html file. processJson() function ).
// So basically, the URL will be constructed as follows: https://www.bible.com/_next/data/X1NJ9qQJf_991mHG-VJjR/en/bible/1/${chapter_usfm}.${version_abbreviation}.json?versionId=${version_abbreviation}&usfm=${chapter_usfm}


// FEATURE
// PREV CHAPTER
// We will be using the same URL: https://www.bible.com/_next/data/X1NJ9qQJf_991mHG-VJjR/en/bible/1/${chapter_usfm}.${version_abbreviation}.json?versionId=${version_abbreviation}&usfm=${chapter_usfm}
// Therefore, from the API response, example: ( check the response.json file in the demo folder )
// There will be the following property: "previous": null,
// If previous is null, it means there is no previous chapter.



// NEXT CHAPTER
// We will be using the same URL: https://www.bible.com/_next/data/X1NJ9qQJf_991mHG-VJjR/en/bible/1/${chapter_usfm}.${version_abbreviation}.json?versionId=${version_abbreviation}&usfm=${chapter_usfm}
// Therefore, from the API response, example: ( check the response.json file in the demo folder )
// There will be the following property: 
// "next": {
//                 "canonical": true,
//                 "usfm": [
//                     "GEN.13"
//                 ],
//                 "human": "Genesis 13",
//                 "toc": true,
//                 "version_id": 1
//             }
//NOTICE: we have the property "usfm" as an array, we will use the first element of the array. And we have the property "version_id", we will use this value.
// If next is null, it means there is no next chapter.

// URL for fetching readable chapter content (HTML)
// Example: https://www.bible.com/bible/1/GEN.1.KJV.json - seems incorrect based on observed demo
// Observed demo URL for content (response.json in demo folder) likely points to a URL like:
// https://www.bible.com/_next/data/BUILD_ID/en/bible/VERSION_ID/USFM.json
// Example for KJV (ID 1), Genesis 1 (GEN.1):
// https://www.bible.com/bible/1/GEN.1.json (This fetches content directly, simpler)
export const readableApiUrl = 'https://www.bible.com/bible/<version_id>/<chapter_usfm_plus_version_abbreviation>.json';

// NOTES FOR CHAPTER CONTENT FETCHING:
