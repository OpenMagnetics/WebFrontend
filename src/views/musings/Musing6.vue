<script setup>
import Header from '/src/components/BasicHeader.vue'
import Footer from '/src/components/Footer.vue'
</script>

<template>
    <Header />
    <main role="main" class="main">
        <div class="container" >
            <div class="row justify-content-center">
                <div class="col-md-9 ">
                    <h1 class="text-white">Alf’s Musings #6</h1>
                    <div class="user d-flex align-items-start justify-content-between bg-secondary p-4 rounded">
                        <div class="d-flex align-items-start">
                            <div class="d-block">
                                <span class="d-block text-white">by <a class="h6">Alfonso Martínez</a></span>
                                <span class="d-block text-muted">8th Aug 2022</span>
                            </div>
                        </div>
                    </div>
                    <!--//blog section-->
                    <div class="blog-section text-white">
                        <p>
                        In the previous article we discussed that in a magnetic component we have a <s>chunk</s> core, made of Iron Oxide, with wires around it, creating a magnetic field. through it. 
                        </p>
                        <p>
                        Now I want you to image the typical picture of a dipole magnet (or just the Earth) with its magnetic lines drawn. They are close, right? They always come back to the magnet.
                        </p>
                        <img src="/images/musings/6/image1.webp" class="img-fluid bounce-little my-3 mx-auto d-block" alt="magnetic field magnet earth" width="500" height="auto">
                        <p>
                        And if we come back now to our magnetic core, probably you have imagined it as a shard, or when we went fashion, as kind of cylinder or column, right? But we just said that the magnetic field must come back, so if we have just a cylindrical core, as the classical magnet, the return path will  be through the air, and we said that air is devilish.
                        </p>
                        <p>
                        This is why commercial magnetic cores are not cylinders, but close shapes, like a toroid. But toroids are difficult to wind (if you don't believe, you have never sewn a button) so shapes that can be divided into two part and then put together are preferred. And this is how U-shaped cores are born.
                        </p>
                        <p>
                        But in a U core, we wind the wires around one leg of the core, and use the other as the returning path for the magnetic field. There is a problem with this, as the turns have the problem of going 360º around the leg, so the magnetic field produced on the opposite side of the returning leg has nowhere to return through, but our hated air.
                        </p>
                        <p>
                        So, let's add another path of ferrite at the opposte side of our current returning leg, symmetrical to the one we currently have. Now we have two returning paths for the magnetic field, one at each side of the one column where we wound the turns, which now stays in the middle. If the previous shape was an U, this one is called E.
                        </p>
                        <p>
                        Allow me a brief pause to introduce a new concept, as I think it makes sense now that we are talking about the magnetic field dividing and having two returning path. The new concept is the amount of magnetic field that crosses a surface perpedicular to its direction: the magnetic flux, and equivalently to other similar physical parameters, like current or heat flux, it can be divided, and circuits can be created with it. And also similarly to current, it will follow the path of minimum reluctance (the magnetic equivalent to resistance), which is the difficulty a material imposes to the magetic flux circulating through it. The reason why, in the previous chapter, we said that the magnetic filed prefers to go through a chunk of iron instead of the air, is because a volume iron has a reluctance several orders of magnitude smaller than the equivalent volume of air.
                        </p>
                        <p>
                        So, what we are really doing in a E shape is creating a magnetic flux divisor for the returning path, and placing these paths at opposite side, so they can allure as much magnetic flux as possible.
                        </p>
                        <p>
                        But I said that a turn has 360º, so what happens with the angles where there are no returning legs? Well, a bit of magnetic flux scapes thorugh there, and it might run havok with other conductors nearby, which is why there are ferrite cores that cover most of the 360º angle. These core are call Pot cores, or just P cores, and they look like a cylinder with holes (for the getting the wires in and out).
                        </p>
                        <p>
                        And between and E and P core, there are a lot of families that cover all the spectrum of angles: PM, PQ, RM, EC, EPX, LP, EQ, ETD, etc. Each of these types of core have something for which they are optimized: shape of the column, blocking of scaping magnetic flux in more or less angles, low profile, mechanical easiness to insert in narrow spaces, or just manufacturing costs. As a general rule, the simplest the shape, the cheapest it is.
                        </p>
                        <p>
                        If you took a glance at a RM core, you may be wondering, how can I model such a complex piece? Well, engineers don't like complex stuff, so a set of effective parameters were invented. These effective parameters are used in the calculations of buck results, as the average magnetic field or the core losses.
                        </p>
                        <p>
                        They are:
                        </p>
                        <ul>
                            <li>
                            Effective length: This is the equivalent length that the magnetic flux travels through the core. If we would be talking about a pipe carrying water, instead of a core with magnetic flux, this would be the length of the pipe.
                            </li>
                            <li>
                            Effective area: This is the equivalent section the that magnetic flux traverses, because the shape of the core is not uniform and its section changes along the path. In our previous pipe example, this would be the section of the pipe.
                            </li>
                            <li>
                            Effective volume: This is the product of the effective length by the effective area, and represents the equivalent volume that is magnetized by the field. It is commonly used to calculate the core losses from the core losses density. In our pipe example, this would be the volume of the water inside the pipe at a given instant.
                            </li>
                            <li>
                            Minimum area: This is the minimum area seen by the magnetic flux along its path. This is commonly used to calculate the peak magnetix flux density. If our pipe example had a bottleneck in some point of its length, this would be the section of that bottleneck; if not it would be equal to the effective area.
                            </li>
                            <li>
                            Winding Window area: This is not an effective parameter per se, according to the standard, but it as useful, if not more, as the others. It is the area between the winding column and the closest lateral column (the returning leg), and it represents the area where all the wires of the magnetic will have to fit, and equivalently, where all the current must circulate once, in the case of inductors, or twice, in the case of transformers.
                            </li>
                        </ul>

                    </div>
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>

