export function createUIAction() {
    const registry = {};
    const middlewareList = [];
    function registerNode(nodeId, label, description) {
        if (!registry[nodeId])
            registry[nodeId] = {};
        registry[nodeId]._meta = { label, description };
    }
    function registerAction(nodeId, actionId, def) {
        registerNode(nodeId, def.label, def.description);
        registry[nodeId][actionId] = def;
    }
    function unregisterAction(nodeId, actionId) {
        const node = registry[nodeId];
        if (!node)
            return;
        delete node[actionId];
        if (Object.keys(node).length === 1)
            delete registry[nodeId];
    }
    async function invoke(nodeId, actionId, payload) {
        console.log({
            nodeId,
            registry
        });
        const node = registry[nodeId];
        if (!node)
            throw new Error(`Node ${nodeId} not found`);
        const def = node[actionId];
        if (!def)
            throw new Error(`Action ${actionId} not found on ${nodeId}`);
        let idx = -1;
        const ctx = { nodeId, actionId, payload };
        const run = async () => {
            idx++;
            if (idx < middlewareList.length)
                return middlewareList[idx](ctx, run);
            const res = await def.handler(payload);
            ctx.result = res;
            return res;
        };
        return run();
    }
    function registerMiddleware(mw) {
        middlewareList.push(mw);
    }
    function describe() {
        return registry;
    }
    return {
        registerNode,
        registerAction,
        unregisterAction,
        invoke,
        registerMiddleware,
        describe
    };
}
