export const url = `http://localhost:4001`;
export function getUrl(endpoint = ""){
    return `${url}/${endpoint}`;
}
