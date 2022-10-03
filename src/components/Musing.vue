<script>
export default {
    name: "Musing",
    props: {
        id: {
            type: Number,
            required: true
        },
        link: {
            type: String,
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
        date: {
            type: String,
            required: true
        },
        imgSrc: {
            type: String,
            required: true
        },
        imgAlt: {
            type: String,
            required: true
        }
    },
}
</script>

<template>
    <div class="col-lg-6">
        <div class="card flex-lg-row mt-4 box-shadow h-lg-250">
            <div class="card-body d-flex flex-column align-items-start bg-light">
                <strong class="d-inline-block mb-2 text-info">{{section}}</strong>
                <h3 class="mb-0">
                    <a class="text-white" :href="link">{{title}}</a>
                </h3>
                <div class="mb-1 text-muted">{{date}}</div>
                <p class="card-text text-start text-white mb-auto">{{description}}</p>
                <a :href="link">Read it!</a>
            </div>
            <img class="card-img-right flex-auto d-none d-lg-block" :alt="imgAlt" style="object-fit: cover; width: 150px; max-height: 150px;" :src="imgSrc">
        </div>
    </div>
</template>

