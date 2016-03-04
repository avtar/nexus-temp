"use strict";

var fluid = require("infusion"),
    kettle = require("kettle"),
    gpii = fluid.registerNamespace("gpii");

require("../index.js");
require("../src/test/NexusTestUtils.js");

kettle.loadTestingSupport();

fluid.registerNamespace("gpii.tests.nexus.bindModel");

gpii.tests.nexus.bindModel.componentOptions = {
    type: "fluid.modelComponent",
    model: {
        someModelPath: 2
    }
};

gpii.tests.nexus.bindModel.registerModelListenerForPath = function (componentPath, modelPath, event) {
    var component = gpii.nexus.componentForPath(componentPath);
    component.applier.modelChanged.addListener(modelPath, event.fire);
};

fluid.defaults("gpii.tests.nexus.bindModel.wsClient", {
    gradeNames: "kettle.test.request.ws",
    path: "/bindModel/%componentPath/%modelPath",
    port: "{configuration}.options.serverPort",
    termMap: {
        componentPath: "{tests}.options.testComponentPath",
        modelPath: "{tests}.options.testModelPath"
    }
});

// TODO: Test with multiple connected WebSocket clients
// TODO: Test with change message path other than ""

gpii.tests.nexus.bindModel.testDefs = [
    {
        name: "Bind Model",
        gradeNames: "gpii.test.nexus.testCaseHolder",
        expect: 6,
        config: {
            configName: "gpii.tests.nexus.config",
            configPath: "%gpii-nexus/tests/configs"
        },
        testComponentPath: "nexusBindModelTestComponent",
        testModelPath: "someModelPath",
        components: {
            client: {
                type: "gpii.tests.nexus.bindModel.wsClient"
            }
        },
        events: {
            targetModelChanged: null
        },
        /*
        // TODO: See gpii.tests.nexus.bindModel.registerModelListenerForPath
        invokers: {
            fireTargetModelChanged: {
                "this": "{testCaseHolder}.events.targetModelChanged",
                method: "fire"
            }
        },
        */
        sequence: [
            {
                func: "gpii.test.nexus.assertNoComponentAtPath",
                args: ["Component not yet constructed", "{tests}.options.testComponentPath"]
            },
            {
                func: "{constructComponentRequest}.send",
                args: [gpii.tests.nexus.bindModel.componentOptions]
            },
            {
                event: "{constructComponentRequest}.events.onComplete",
                listener: "gpii.test.nexus.assertStatusCode",
                args: ["{constructComponentRequest}", 200]
            },
            {
                func: "gpii.tests.nexus.bindModel.registerModelListenerForPath",
                args: [
                    "{tests}.options.testComponentPath",
                    "{tests}.options.testModelPath",
                    "{testCaseHolder}.events.targetModelChanged"
                ]
            },
            {
                func: "{client}.connect"
            },
            {
                event: "{client}.events.onConnect",
                listener: "fluid.identity"
            },
            {
                event: "{client}.events.onReceiveMessage",
                listener: "jqUnit.assertEquals",
                args: ["Received initial message with the state of the component's model", 2, "{arguments}.0"]
            },
            {
                func: "{client}.send",
                args: [
                    {
                        path: "",
                        value: 10
                    }
                ]
            },
            {
                event: "{testCaseHolder}.events.targetModelChanged",
                listener: "gpii.test.nexus.assertComponentModel",
                args: ["Model updated", "{tests}.options.testComponentPath", { someModelPath: 10 }]
            },
            {
                event: "{client}.events.onReceiveMessage",
                listener: "jqUnit.assertEquals",
                args: ["Received change message", 10, "{arguments}.0"]
            },
            {
                func: "{client}.disconnect"
            }
        ]
    }
];

kettle.test.bootstrapServer(gpii.tests.nexus.bindModel.testDefs);
