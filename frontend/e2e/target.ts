const name = process.env.E2E_TARGET ?? "local";
if (name !== "local" && name !== "staging") {
    throw new Error("E2E_TARGET must be local or staging");
}

function required(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return value;
}

export const target = {
    name,
    baseURL: required("E2E_BASE_URL"),
    username:
        name === "staging"
            ? required("E2E_USERNAME")
            : (process.env.E2E_USERNAME ?? "dev"),
    password:
        name === "staging"
            ? required("E2E_PASSWORD")
            : (process.env.E2E_PASSWORD ?? "cinexplorer-dev"),
};
