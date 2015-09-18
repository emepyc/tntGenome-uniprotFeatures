var theme = function () {
    "use strict";
    // Vars
    // var thisGene = "SNORD25";
    var thisGene = "SSBP1";
    // var thisGene = "ENSG00000157764";

    var colors = {
        // proteins
        "protein coding"        : d3.rgb('#A00000'),
        "pseudogene"            : d3.rgb('#666666'),
        "processed transcript"  : d3.rgb('#0033FF'),
        "ncRNA"                 : d3.rgb('#8B668B'),
        "antisense"             : d3.rgb('#CBDD8B'),
        "TR gene"               : d3.rgb('#AA00AA'),

        // transcripts
        "non coding transcript" : d3.rgb('#8B668B'),
    };

    var biotype_to_legend = {
        // gene biotypes
        "protein_coding"                     : "protein coding",
        "pseudogene"                         : "pseudogene",
        "processed_pseudogene"               : "pseudogene",
        "unprocessed_pseudogene"             : "pseudogene",
        "polymorphic_pseudogene"             : "pseudogene",
        "unitary_pseudogene"                 : "pseudogene",
        "transcribed_unprocessed_pseudogene" : "pseudogene",
        "TR_V_pseudogene"                    : "pseudogene",
        "processed_transcript"               : "processed transcript",
        "TEC"                                : "processed transcript",
        "miRNA"                              : "ncRNA",
        "lincRNA"                            : "ncRNA",
        "misc_RNA"                           : "ncRNA",
        "snoRNA"                             : "ncRNA",
        "snRNA"                              : "ncRNA",
        "rRNA"                               : "ncRNA",
        "antisense"                          : "antisense",
        "sense_intronic"                     : "antisense",
        "TR_V_gene"                          : "TR gene",
        "TR_C_gene"                          : "TR gene",
        "TR_J_gene"                          : "TR gene",
        "TR_D_gene"                          : "TR gene",


        // transcript biotypes
        "retained_intron"                    : "non coding transcript",
        "nonsense_mediated_decay"            : "protein coding",
    };

    var current_height = 200;


    var gB = tnt.board.genome()
        .species("human")
        .gene(thisGene)
        .width(950)
        .context(10);

    var t = function (genomeDiv, featuresDiv, featuresHeader) {
        set_default_msg();

        // Genome Browser
        // var gene_track = tnt.board.track()
        //     .height(200)
        //     .background_color("#c6dcec")
        //     .display(tnt.board.track.feature.genome.gene()
        //          .foreground_color("#586471")
        //     )
        //     .data(tnt.board.track.data.genome.gene());
        //
        // var transcript_track = tnt.board.track()
        //     .height(200)
        //     .background_color("#c6dcec")
        //     .display(tnt.board.track.feature.genome.transcript()
        //         .foreground_color("red")
        //     )
        //     .data(tnt.board.track.data.genome.transcript());

        // Changing the location track to display what we want
        gB.tracks()[0].display().text(function (sp, chr, from, to) {
            return "Chr " + chr + " : " + from + " - " + to;
        });

        var mydata = tnt.board.track.data.genome.transcript();
        var mix_track = tnt.board.track()
            .height(current_height)
            .background_color("white")
            .display(tnt.board.track.feature.genome.transcript()
                .foreground_color (function (t) {
                    return t.featureColor;
                    // if (t.isGene) {
                    //     return t.featureColor;
                    //     return "#005588";
                    // }
                    // return "red";
                })
                .on("click", function (d) {
                    clickedEntity(d);
                })
             )
            .data(mydata);


        // Gene selection
        d3.select(genomeDiv)
            .append("div")
            .attr("id", "gene_select");

        // The legend for the gene colors
        var legend_div = d3.select(genomeDiv)
    	    .append("div")
    	    .attr("class", "tnt_legend_div");

    	legend_div
    	    .append("text")
    	    .text("Gene legend:");

    	d3.selectAll("tnt_biotype")
            .data(mix_track.data().elements());

        // Gene colors and legend
        mydata.update().success (function (genes) {

            genes.map(gene_color);

            // And we setup/update the legend
            var biotypes_array = genes.map(function(e){
                return biotype_to_legend[e.gene.biotype];
            });
            // also the ones for the transcript of the matching gene
            var transcript_biotypes = genes.filter (function (e2) {
                    return e2.gene.external_name === thisGene;
                }).map (function (e) {
                    return biotype_to_legend[e.transcript.biotype];
                });

            biotypes_array = biotypes_array.concat(transcript_biotypes);

            var biotypes_hash = {};
            for (var i=0; i<biotypes_array.length; i++) {
                biotypes_hash[biotypes_array[i]] = 1;
            }
            var biotypes = [];
            for (var p in biotypes_hash) {
                if (biotypes_hash.hasOwnProperty(p)) {
                    biotypes.push(p);
                }
            }
            var biotype_legend = legend_div.selectAll(".tnt_biotype_legend")
                .data(biotypes, function(d){return d;});

            var new_legend = biotype_legend
                .enter()
                .append("div")
                .attr("class", "tnt_biotype_legend")
                .style("display", "inline");

            new_legend
                .append("div")
                .style("display", "inline-block")
                .style("margin", "0px 2px 0px 15px")
                .style("width", "10px")
                .style("height", "10px")
                .style("border", "1px solid #000")
                .style("background", function(d){
                    return colors[d];
                });

            new_legend
                .append("text")
                .text(function(d){return d;});
            biotype_legend
                .exit()
                .remove();
        });


        mydata.update().success(function (transcripts) {
            var newGenes = {};
            for (var i=0; i<transcripts.length; i++) {
                var t = transcripts[i];
                var mygene = t.gene.external_name;
                if (thisGene === mygene) {
                    newGenes[t.external_name] = t;
                    for (var j=0; j<t.exons.length; j++) {
                        var e = t.exons[j];
                        e.featureColor = t.featureColor;
                    }
                    continue;
                } else if (newGenes[mygene] === undefined) {
                    t.exons = [{
                        start : t.start,
                        end : t.end,
                        offset : 0,
                        isGene : true,
                        featureColor: t.featureColor
                    }];
                    t.introns = [];
                    t.display_label = mygene;
                    t.isGene = true;
                    newGenes[mygene] = t;
                } else {
                    var newStart = d3.min([newGenes[mygene].start, t.start]);
                    newGenes[mygene].start = newStart;
                    newGenes[mygene].exons[0].start = newStart;
                    var newEnd = d3.max([newGenes[mygene].end, t.end]);
                    newGenes[mygene].end = newEnd;
                    newGenes[mygene].exons[0].end = newEnd;
                }
            }
            var elems = [];
            for (var elem in newGenes) {
                if (newGenes.hasOwnProperty(elem)) {
                    elems.push(newGenes[elem]);
                }
            }
            return elems;
        });

        // Include a class to the genes having 'protein_coding' biotype
        var transcript_create = mix_track.display().create();
        var transcript_create_with_class = function (elems, xScale) {
            transcript_create.call(this, elems, xScale);
            var set_cursor = function () {
                this
                    .style("cursor", "pointer");
            };

            var protein_coding_genes = elems
                .filter(function (d) {
                    if ((d.gene.external_name === thisGene) || (d.gene.id === thisGene)) {
                        return biotype_to_legend[d.transcript.biotype] === "protein coding";
                    } else {
                        return biotype_to_legend[d.gene.biotype] === "protein coding";
                    }
                    //return d.gene.biotype === "protein_coding" || d.transcript.biotype === "protein_coding";
                });
            protein_coding_genes
                .selectAll("text")
                .call(set_cursor);
            protein_coding_genes
                .selectAll("rect")
                .call(set_cursor);
        };
        mix_track.display().create(transcript_create_with_class);

        // Update the track based on the number of needed slots for the genes
        mix_track.display().layout()
            .fixed_slot_type("expanded")
            .on_layout_run (function (types, current) {
                var needed_height = types.expanded.needed_slots * types.expanded.slot_height;
                if (needed_height !== current_height) {
                    current_height = needed_height;
                    mix_track.height(needed_height);
                    gB.reorder(gB.tracks());
                }
        });


        gB(genomeDiv);
        // gB.add_track(gene_track);
        // gB.add_track(transcript_track);
        gB.add_track(mix_track);
        gB.start();

        gB.xref_search (function (resp, gene, species) {
            console.log(resp);
            console.log(gene);
            console.log(species);
            d3.select("#gene_select").selectAll("*").remove();
            // Filter out LRG_ genes
            var genes = resp.body.filter(function (gene) {
                return gene.id.indexOf("LRG_");
            });

            if (!genes.length) {
                console.log("No gene found for " + gene + " in " + species);
                d3.select(genomeDiv)
                    .html("No gene found for <b>" + gene + "</b>");
                clean_features();
            }
            if (genes.length > 1) {
                console.log("More than one entry found for " + gene + " in " + species);
                var select = d3.select(genomeDiv).select("#gene_select")
                    .append("select")
                    .on("change", function () {
                        thisGene = this.value;
                        gB.gene (thisGene);
                        gB.start();
                    });
                select.selectAll("option")
                    .data(genes)
                    .enter()
                    .append("option")
                    .text(function (d) {
                        return d.id;
                    });
            }
        });


        // Functions
        function clickedEntity (data) {
            console.log (thisGene);
            console.log(data);
            if (thisGene === data.gene.external_name) {
                displayUniprotInfo(data);
            } else {
                // We change the gene that is displayed as transcripts
                // but only if it is likely to be in Uniprot
                if (biotype_to_legend[data.gene.biotype] === "protein coding") {
                    set_default_msg();
                    thisGene = data.gene.external_name;
                    var thisId = data.gene.id;
                    gB.gene(thisId);
                    gB.start();
                } else {
                    displayUniprotInfo(data);
                }
            }
        }

        function displayUniprotInfo (data) {
            var url = "http://rest.ensembl.org/xrefs/id/" + data.id +
            "?content-type=application/json;all_levels=1";
            d3.json(url, function (resp) {
                // Look for any Uniprot entry
                var found = false;
                for (var i=0; i<resp.length; i++) {
                    if (resp[i].dbname.indexOf("Uniprot") === 0) {
                        found = true;
                        var uniprotEntry = resp[i];
                        console.log(uniprotEntry.primary_id);
                        var FeatureViewer = require("biojs-vis-proteinFeaturesViewer");
                        var fvInstance = new FeatureViewer({
                            el: featuresDiv,
                            uniprotacc: uniprotEntry.primary_id
                        });
                        d3.select(featuresHeader)
                            .text("Protein information for " + data.external_name);
                    }
                }
                if (!found) {
                    console.log("NOT FOUND IN UNIPROT");
                    d3.select(featuresHeader)
                        .text("");

                    clean_features();
                    var featuresCont = d3.select(featuresDiv);
                    featuresCont
                        .append("p")
                        .text("No protein information found for " + data.external_name + " in Uniprot");

                }
            });
        }

        function gene_color (transcript) {
            if (transcript.gene.external_name === thisGene) {
                transcript.featureColor = colors[biotype_to_legend[transcript.transcript.biotype]];
            } else {
                transcript.featureColor = colors[biotype_to_legend[transcript.gene.biotype]];
                return;
            }
        }

        function clean_features() {
            var featuresCont = d3.select(featuresDiv);
            featuresCont.selectAll("*")
                .remove("*");
        }

        function set_default_msg () {
            clean_features();
            var default_msg = "Click on a gene or transcript above to get Uniprot information";
            d3.select(featuresHeader)
                .text(default_msg);
        }

    };

    return t;
};
