var theme = function () {
    "use strict";
    // Vars
    var thisGene = "BRAF";
    var gB = tnt.board.genome()
        .species("human")
        .gene(thisGene)
        .width(950)
        .context(10);

    var t = function (genomeDiv, featuresDiv, featuresHeader) {

        // Genome Browser
        var gene_track = tnt.board.track()
            .height(200)
            .background_color("#c6dcec")
            .display(tnt.board.track.feature.genome.gene()
                 .foreground_color("#586471")
            )
            .data(tnt.board.track.data.genome.gene());

        var transcript_track = tnt.board.track()
            .height(200)
            .background_color("#c6dcec")
            .display(tnt.board.track.feature.genome.transcript()
                .foreground_color("red")
            )
            .data(tnt.board.track.data.genome.transcript());

        var mydata = tnt.board.track.data.genome.transcript();
        mydata.update().success(function (transcripts) {
            var newGenes = {};
            for (var i=0; i<transcripts.length; i++) {
                var t = transcripts[i];
                var mygene = t.gene.external_name;
                if (thisGene === mygene) {
                    newGenes[t.external_name] = t;
                    continue;
                } else if (newGenes[mygene] === undefined) {
                    t.exons = [{
                        start : t.start,
                        end : t.end,
                        offset : 0,
                        isGene : true
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

        var mix_track = tnt.board.track()
            .height(200)
            .background_color("white")
            .display(tnt.board.track.feature.genome.transcript()
                .foreground_color (function (t) {
                    if (t.isGene) {
                        return "#005588";
                    }
                    return "red";
                })
                .on("click", function (d) {
                    var url = "http://rest.ensembl.org/xrefs/id/" + d.id +
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
                                    .text("Protein information for " + d.external_name);
                            }
                        }
                        if (!found) {
                            console.log("NOT FOUND IN UNIPROT");
                            d3.select(featuresHeader)
                                .text("");
                            var featuresCont = d3.select(featuresDiv);
                            featuresCont.selectAll("*")
                                .remove("*");
                            featuresCont
                                .append("p")
                                .text("No protein information found for " + d.external_name + " in Uniprot");
                        }
                    });
                    console.log(d);
                })
             )
            .data(mydata);


        gB(genomeDiv);
        // gB.add_track(gene_track);
        // gB.add_track(transcript_track);
        gB.add_track(mix_track);
        gB.start();

    };

    return t;
};
