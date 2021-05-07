import Vue from "vue";

import {createJSONElement} from "../../planning_poker/assets/js/utils";
import PokerConsumer from "../../planning_poker/assets/js/consumers/poker-consumer";
import PokerSite from "../../planning_poker/assets/js/components/PokerSite.vue";

describe("PokerConsumer", () => {
    document.body.innerHTML = '<PokerSite id="planning_poker-container"></PokerSite>';

    createJSONElement({
        non_point_options: [["A", "A"], ["B", "B"]],
        point_options: [["1", "1"], ["2", "2"], ["3", "3"], ["5", "5"]]
    }, "options");

    createJSONElement([...Array(5).keys()].map(i => {
        let j = i + 1;
        return {id: j, story_label: `Story ${j}`, description: `<p>Description of Story #${j}</p>`};
    }), "initial-stories");

    createJSONElement({moderate: false, vote: true}, "permissions");

    let pokerConsumer = new PokerConsumer(document.body, 'ws://test', '1');
    pokerConsumer.websocket.close()

    Vue.prototype.$t = jest.fn();
    Vue.prototype.$interpolate = jest.fn();
    Vue.prototype.$consumer = pokerConsumer;

    let app = new Vue({
        el: '#planning_poker-container',
        render: h => h(PokerSite)
    });

    pokerConsumer.app = app.$children[0];
    pokerConsumer.app.$refs.storiesOverview.activeStory = {id: 1337, title: "Story #1337", description: "<p>foo</p>"};
    pokerConsumer.app.$root = {
        '$refs': {
            'participantsList': {
                'participants': []
            }
        }
    };

    const storiesOverview = pokerConsumer.app.$refs.storiesOverview;
    const voteOptions = pokerConsumer.app.$refs.voteOptions;
    const voteOverview = pokerConsumer.app.$refs.voteOverview;

    it("sets the points of the current active and changes the active story to the first story in the upcoming stories list", () => {
        pokerConsumer.storyPointsSubmitted({"story_points": "3"});
        expect(storiesOverview.activeStory.id).toEqual(1);
        let lastPreviousStories = storiesOverview.previousStories[storiesOverview.previousStories.length - 1];
        expect(lastPreviousStories.points).toEqual("3");
        expect(lastPreviousStories.id).toEqual(1337);
    });

    describe("storyChanged", () => {
        it("doesn't remove the user's choice when they haven't voted.", () => {
            const data = {
                id: 3,
                title: "Story 3",
                description: "<p>Description of Story #3</p>",
                votes: {3: [{id: 20, name: "Thorsten"}]}
            };
            pokerConsumer.storyChanged(data);

            expect(pokerConsumer.storyId).toEqual(3);
            expect(storiesOverview.activeStory.id).toEqual(3);
            expect(voteOptions.options["point_options"]).toContainEqual(["3", "3"]);
        });

        it("removes the user's choice when they have voted.", () => {
            const data = {
                id: 2,
                title: "Story 2",
                description: "<p>Description of Story #2</p>",
                votes: {3: [{id: 1, name: "Thorsten"}]}
            };
            pokerConsumer.storyChanged(data);

            expect(pokerConsumer.storyId).toEqual(2);
            expect(storiesOverview.activeStory.id).toEqual(2);
            expect(voteOptions.options["point_options"]).not.toContainEqual(["3", "3"]);
        });
    });

    it("updateStoryInformation renders the correct data", async () => {
        pokerConsumer.updateStoryInformation("Some Title", "<b>Some description</b>");
        await pokerConsumer.app.$nextTick;
        expect(document.body.querySelector("h2.story-label").innerHTML).toEqual("<!---->Some Title");
        expect(document.body.querySelector("div.description-text").innerHTML).toEqual("<b>Some description</b>");
    });

    it("updateResults updates the results correctly", () => {
        let votes = {3: [{id: 1, name: "Thorsten"}, {id: 58, name: "Franz"}], 13: [{id: 42, name: "Otto"}]};
        pokerConsumer.updateResults(votes);

        expect(voteOverview.votes).toEqual(votes);
        expect(pokerConsumer.app.userVoted).toEqual(true);
    });

    it("determines whether the user has already voted or not correctly", () => {
        let votes = {3: [{id: 1, name: "Thorsten"}, {id: 58, name: "Franz"}], 13: [{id: 42, name: "Otto"}]};
        expect(pokerConsumer.hasUserVoted(votes)).toEqual(true);
        votes[3][0].id = 11;
        expect(pokerConsumer.hasUserVoted(votes)).toEqual(false);
    });
});