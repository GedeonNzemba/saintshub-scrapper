import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

// Set up a cookie jar and axios client that supports cookies
const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

export { client };