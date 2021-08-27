var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return typeof sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
    return false;
};

$(document).ready(()=>{
    $(".login100-form-avatar > img:nth-child(1)").hide()
    let id = getUrlParameter("id")
    $.get("/vkauth/data?id="+id, (data)=>{
        try {
            $(".login100-form-avatar > img:nth-child(1)").attr("src", data.vk_photo)
            $(".login100-form-avatar > img:nth-child(1)").toggle(150)
            $(".login100-form-title").html(data.vk_name)
        }catch(error){
            
        }
    })
})