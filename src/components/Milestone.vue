<script>
import axios from "axios";
export default {
    props: {
        id: {
            type: Number,
            required: true
        },
        index: {
            type: Number,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        section: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        imgSrc: {
            type: String,
            required: false,
            default: null
        },
        imgAlt: {
            type: String,
            required: false,
            default: null
        },
        state: {
            type: String,
            required: true,
            default: "Backlog"
        },
        state: {
            type: String,
            required: true,
            default: "Backlog"
        }
    },
    data() {
        return {
            backgroundColor: 'red',
            numberVotes: 0,
            ipAddress: 0,
            alreadyVoted: true
        }
    },
    computed: {
        btn_class() {
            if (this.alreadyVoted) {
                return "btn btn-danger mx-3";
            }
            else {
                return "btn btn-secondary mx-3";
            }

        },
        badge_color_style() {
            if (this.section == "Core losses") {
                return "background-color: SlateGrey; color: var(--bs-dark)";
            }
            else if (this.section == "Gap Reluctance") {
                return "background-color: MediumAquaMarine; color: var(--bs-dark)";
            }
            else if (this.section == "Magnetic Design") {
                return "background-color: Gold; color: var(--bs-dark)";
            }
            else if (this.section == "Waveform Artisan") {
                return "background-color: Pink; color: var(--bs-dark)";
            }
            else if (this.section == "Core Design") {
                return "background-color: Green; color: var(--bs-dark)";
            }

        },
        card_class() {
            if (this.state == "To Do") {
                return "bg-primary";
            }
            else {
                return "bg-info";
            }

        }
    },
    mounted () {
        fetch('https://api.ipify.org?format=json')
        .then(x => x.json())
        .then(({ ip }) => {
            this.ipAddress = ip;
            axios.post(import.meta.env.VITE_API_ENDPOINT + '/is_vote_casted', {
                ip_address: ip,
                user_id: null,
                milestone_id: this.id,
            })
            .then(response => {
                this.alreadyVoted = response.data['already_voted'];
            })
            .catch(error => {
            });
        });

        axios.post(import.meta.env.VITE_API_ENDPOINT + '/get_number_votes', {
            milestone_id: this.id,
        })
        .then(response => {
            this.numberVotes = response.data['number_votes'];
        })
        .catch(error => {
        });
    },
    methods: {
        vote(event) {
            axios.post(import.meta.env.VITE_API_ENDPOINT + '/cast_vote', {
                ip_address: this.ipAddress,
                user_id: null,
                milestone_id: this.id,
            })
            .then(response => {
                this.alreadyVoted |= response.data['voted'];
                if (response.data['voted'])
                    this.numberVotes += 1;
            })
            .catch(error => {
            });
        }  
    }
}
</script>

<template>
    <div class="col-md-6 col-lg-4 col-xl-3 d-flex align-items-stretch">
        <div class="card mt-4 box-shadow" :class=card_class>
            <div class="card-header bg-transparent row mb-2">
                <h4 class="text-secondary col-2">{{index + 1}}</h4>
                <h4 class="text-dark col-7 font-size-lg">{{title}}</h4>
                <div class="col-3 ">
                    <span :style=badge_color_style class="badge rounded-pill text-wrap font-size-lg">{{section}}</span>
                </div>
            </div>

            <div class="card-body" style="display: flex; justify-content: space-between; p-0 m-0">
                <p class="card-text text-start text-dark mb-auto mx-2">{{description}}</p>
                <img v-if="imgSrc != null" class="card-img-right flex-auto d-none d-lg-block" :alt="imgAlt" style="object-fit: cover; width: 150px; max-height: 150px;" :src="imgSrc">
            </div>
            <div v-if="state == 'To Do'" class="card-footer bg-transparent">
                <p class="text-end text-dark my-0">Current votes: {{numberVotes}}
                    <button :disabled="alreadyVoted" :class=btn_class @click="vote">{{alreadyVoted? "Already voted" : "Vote feature!"}}</button>
                </p>
            </div>
            <div v-else class="card-footer bg-transparent">
                <span style="background-color: var(--bs-info); color: var(--bs-secondary); font-size: 20px" class="badge rounded-pill text-wrap ">{{state}}</span>
            </div>
        </div>
    </div>
</template>

