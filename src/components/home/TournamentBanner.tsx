import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

// Trophy image extracted from Figma design (base64)
const TROPHY_SRC = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAABdCAYAAAAlrXG6AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAAGwpJREFUeAHtXAmUXGWVvu+9eq/eq72r13T2hKxAkCTCQZZEDcpiOMgxKAgqqIkOh0UMLoMjLc5BPePg6CgOuICgjJMooFEiEEkAE0hIJ0BIk5DuTu/d1dVV1dW1vP39c+//umOGM854tLu6w+mbU+nqrlfbfff/7ne/e/8HMG3TNm3TNm3TNm3TNm3TNm2nogn0H2NMuP/+/fKWLVskeBuaAJNk5Ng9r7XVzpo151rmso/iJ1lmuwCOaaYdz3zJsth9q5bU/YkOhbeBTYqjycmtfcXPxiLa103LrCqVyqCoCsSiIbBtgJERHWzHcwxDv3P1soZvC4Jwyjt7MhwttA6UbxaZ+81jb7arXR3doJtlCEXUXEPj7KEVpy9e5KCz8yMlsDDEDdO+ZM3qOU/DKW4iVNheaRu43HGs7/xpzz71wMFXYSg7bJcN8xtPPf5I3W8f3XdGe0fHQ6GwAsViCQojBSiV9bvhbWAVjegtW3ZGVq5d3XKw+fCso0feBBHfPShrX/v8TRvImRweHt95cN7Zyxe3tbS0C8ViGUCSnZbjrcmmm64uwilsFY3oM1eu2JTvy8w8euQ4uExiUlA5sON3z38TTkp4rz53rE/XnUI2l4N0KgXFQl4E16r4yhtvq9gX2PngcTUgB2880tohuK4HgYBoOqJ8x/bt/26efNw7L1g8D9eZls4MQn8mDY7Heu+6+aMFOMWtYo6OnBNYYbnWstRQBtFABlmW9t+56apdbz2upr7qmlR6QO4d6AOHMfAE9jiyDjjVrSKOJjonK6HLB1JpKJSLoMgikwT5AUwR/4O2/XHvm9eomnrbvpf3g17Woa66Om/my/fC24BLV8TRFJEBCS4e6O8HUZRAkgLFowNtfxh7/P7f7g89f6D95qpE7IEDzc3xVH8KZs5oLNmm8aFbN63vggkzVrGlEoAK2MaNGwNgW0uy2ZyAjmYgSM0PNG3O0GNNTVuU5bOrHwyI4obndj0LQ6lBVlOVfIpZ9uYvbr6+BcbZaHU9s699VW0yeYHtDMV0s/+IJ7h73n3WrB6YQKuIo9d/eOOZtufFdcNgoiijz+1dMAoH771s5WeYxzY8+stfQnEkw0Ih7Z5kMvRIw6zTlj3xzMurQ5qmSGIggkuvoAaVwXzJToliqWfPjt8ONDU1eYwWzF8JLVuefL62pXN467LTZl8oiIKgGw4LW65guU52z+H+7x08fOTem65+94TQyIosnReaWz+ImPGrnbteEILBEFaC9rqmz137LMOlu+9Ax292733pAy8jLs+cWauvXnXewWBQPVM39Qh6UWCeAJIoMFmRBTwJEA6HIBaPWHIgkHUsodm0zX26UXrxvo6v7NyyYYv3l8r1nTt3Rhrmr9xbLBaXpYdyvNyfPbuOiVJASGcKYOgmlC3rkbb+7Gc3XbG6DONsFYloTVEWptJZwUNaJ0ki9A10NdPfBfz3tPlqzHR0WLhoIVx04UUawsu7nt7xLBiGhedGEDQtxAIBQZCDMmE7iJIAwaCsJOOxhvra+ssbG2deXl1dxe6Z9ZPiK60DT+x7rfORAUvec8XqxpOdJUSqTvunTDa77PdPPgXZTB4SkdAT71i1ou2MM5bcUp2MyR0dI+DZ3vUzknGEEPaVtybqv9cqkQwRl+W5ZrkMHq1wBj2NS+tPcOdCPrt/8aKlcP67zoN4LA47n90FKSxUTNMED59go/BBvNuxHGD4B/4SjgflsgGDgyk4euQIHH71sNDy+pGoY1rX19RUPbW0PnRob0vPnTt2vFE99j6SElj/4r59kB0egYCqHk11Z6695so1d3T29G02SiaLxkLgei4Irrf5P39zcAaMs024ozH54H9WQ1kvYISKWIC4rU033DDmaNabyvyiqqomjTELkUgEVqw4CzHcgaE0Fix93dDV0Q49PZ1Cb08XdHd1wEBfD6TTacgND3Nnu64r0AmwLAv6B9LQ1tYp5LK5+clE5O6ZS2Yce+5g512P/urZ5agEzs0MDYEaDIIaDr/00ENN/DNcvubs7w90pZ5JRGNYgCJ8FAtyICh9AsbZJtzRlKlwwUeKuo1AIRJeZE5+/JaPf+jg0GDu6+l01tZ1HS6++D2wdu1FGM0U/wjScgBJisgweeFrYTXuOmBaBkqpI+jYATh2rJX1dHfDcG4YHJui34VcbgRaj+HJ6e5NxGPaXbUNDT8v6boaC4chhBCkAAvCaAIlTB8YGbnHxZUjYs4wkOfbtnHpeFO/CkQ0ivngRktGkaIZHFfog7ewhA0fOOcHuqE/faztOGobBfjgVZfD5js+D/WNM8BDx3r4PBczI/1knv+ahO+CJEEgqOBrOujoLHS2H4fOzk4YyefBNAxID6bh1YOv4ZHsLM9xhLq6eojFYhBPRM8jmjf2/kKpY/dwLp/SgkHm4MowbXvRhqatMoyjVaRgsZFFoY+AIdYKzBl6y8PCw4/vS0bjsYv0cgGOtbVyjD5rxWlw911fgk996pMwo3EmlPUij3LbQacjRjujPz06Afi6wPUTCaPRhv7+Puju7II8wksRbwcPHEAoysCCBfNBVhRBDapzvnXf4+ePfYANGzZ4rmG/SoSlhIqhbbuxhXWhMIyjTTjroKpwz4E2RcS4oqg0dXuUpzJhy/bXFssB4SZBZNfhso1aRplHbW9vH8qnQUhWJ+CiC1bBeee8Azq7+mHP7hfhyNE3YXg4xx3quRjaeGMOg1AIeIRL6GxMv1jCl6Cc0UHC90VqiJF+HE5bvADi8SjDZoKgBAMfxg+xmz4IkVx9r97jeQGwEHokXHY1ifC49i4rQu+Qbji4vtEpuPQlVsAGrBKqP/TDoBL8hAiSQJQtkxmCsBaG6mQCBacAZDFxDSME0FLXNBUaZ9TARz5yJcKGCB3YlWlv7+BRm0oNIhUsC5jsmK4r2BILgow0kOAFCyMoGia+RgRmz5kFrbha5sxphDeOtiFVVD+A8HHLmGAV8AC5B2BXxwFNAGWgt1uHcbSKOBpXvEff3MGEIwRko2HBqm9YjnMD8mQOJ4TLFIhVySqoise5Y1W1EeHCgK6uLuhHqhcORxAaApy5qJjQVp19JqxedTbmSgWrdYtlM1mkhDp2ZMocSjxGUCJjYRJF7i1CNybMltdb4H3vfz8gXhOOCVu3biXodCljCM1KyCjmwXDKEBPZ8Lfv+Ni4Fi0T7mhiDi+KHUhQmWCbFlNVdZ6sBa93i94o5lpYgCgQj9QgvQtz+hVLhNHxIgRVlS97Cx3dg3AygPTNROfTY7Ks4iJxKXAhIFMxI1EF6dNJNFL/yuUsJskc9h8L6ORDEMXVQbhuIX3UwuwQYTMdS1G9+0Dr/JHiCCZsD0TGxl1jmfiIpiW83+llkrjScUxWVRVb5plOdTQaAaJzESypFYQKcrCCDotiaaxwRMenYvmtBjVeEc6ZMweqElVAXHg4k8Hqboj6ibhKHB7lNrIKcjwxEBuXv4M3BU8SefH48TaGopWwdvU61odQo1tWTgsL3zq5XJcCyhm5XB5XgghKUDsC42wVSIYAz+5lJYo4pHdiWAutxuUthCMqwkGYymzuYIpcWVbwC4t/VmDwLj2P+DNxcC/CeJUYwGM1jP4SNnBpVIFupmOzIibAUrGItwI/ObF4EvKFETZrznxYvXo1y+PxHT29z2nRxJdu/eT6vWOf8bEdexfhe8RzGPmaGsEq1P0djLMGXgGMRsxw3xiRBAmx04VwJLKIiopjx44jhVuKTgzgcnbpOO50+nb48AlFTgxwOAXRk6iWx2gLgkbMAI8nZwbo5EgyYj/XudFJNthBB+FIhWRNDYwg1JQMG1544UU8kfIXO9+ou3fr1ivdkz9hPJI8t1gqBgulEahpqDM6st3PwzhbRXi06Hk5WZKQQrssgcnJRWd46Nzu7gF0DoNEMsTFJuLIpuEKuPqZ63Jq7Lt7NLYISyniZXR2QPFvhOMRZBXETkjZU1HhkxHzlZDKnU1FyjDqGwoymoY58+9ZuS7x3pOLFXpZJSivH8Aq07Y9iIQiz3zjs9cOwzhbRVjHsG70ykqQEfMIIVwQQyDvoW/x/jA6uQb5rYpJCpOj5SHPJUqMZbfgowiJzh4+l7BYxBAPSHgc/UQW4ikBzjBUT0NMJz5dwMrOAhkZh4KPEYsxavAFsbODyVcKhZWtDz3x0ln4sh302R5++KlaRYL3dBzvQLYTAVUW75+IyaiKRLReMLqJstGyp+rNcgwgcs0dJ4j8Y+g6/o54HInKGKUC45qGadGkElfyKOlRFUjOR3kaTw5Qg5c7m7CdfipBGiuLEUTwFUInKYqVTG1NNUY3yhtYDMkiRPG4m+hzUWTHG2MXl3U9mcmMQHWi/lgqo++GCbCKRLTuWJ1hTWEBUvAx+girZSLOhMvosTH9AvMZRjQ5kwmaGmBEDS0L4cT0uFhE1A2jEkUOkVGRI3GaJwMhgY/zDKqqEkgHDf94pGpEHWtqkqCUdOyoi/zkSqJ4Goym3HiialNHR59AJyscjTx8+7XvzsMEWEUc3dlSePOsc6ttFdtSzqhOoaky404jNuH5nBo4RFBtw1ipRIWZx0tqggABkynhNp4ohm0xSoU8+dHTCOdRw+DvRThe19CAOnfeT6zMwcdUiBHPVojpRKFYKrXRsY8+8fTK+actPb+1tYMl49XdYsn9MUyQVcTRdzWt17f9fs9QKBRuJEgAv9HHI4p+5wod0QzRd7qJyRIDFbp7+rAkT0KBqkrbr/aw6SIE8UEtpDJRCFHRwgsaA2GGNGm6aZoGUdS2+clDJkPnk0rrgm4LQ+Wsh8znFVodf3zp0G1dnb2CaTgwZ27djz59zZoUTJBVxNHoU/aY80JLNBptJM2YHOCMQgFBCRUuhKG8MTDG7ZDOpQeHBOy6MFoB9HcSkpC+cfymosTCE+JrQoQmAhekeLWJx+nYFBjOD0MqPTRKAanirGaJqhrIjIy89OttLy6Z0Vh77eFDzZBIVPWVjOz3YQKtMqIS+to13NdjkfA67hDG+BInTYIiMJmM8d8N3eLOi8VjSPNM0EtlRryYjmdcFkVhH0t2cjx1Ydwx5zsOF/11HQsXy+K/G/j8HJbfBE0oxkEwHOSrBoumoyNtz7XHLr76Z339gwK9/+zZVfdsvG7dhGDzmFVqJIwpprlPU4PMG41iimbXszl+DKaGiNbxJR+LRRECKLP4kyzYQEgzfka7NnYk3weUSKTnddzaJVXQMOZ2SIj8e/2YTqCOO66ZP72imxPW8p+cvX3tuSNU+euiNdqhvaHylr/VP/wETPA1VqYiGHql8pCqg8f4eJUFc/ow7iTAbvyPBh+tnOx7BBAGLFi1Ch5l4ElyuMRNbwVXAoYO/Dv5O90nXQAXPp4D0mvh7GTsspH+TjmJhR51TQFmjmP5xTV31fa3H2lGg9ZisBG6n+RCYYKvYkGOx5802ZBx9hMNAVTV3EuORHcZIJqnUxmVMjvMhwuYJLR5LQDXyYNJDMkNZPCEGXxGuhw7GFTEGHfSTKCIVK5T4bOxREkcntsJbX9j8lQRhb011aKUkSxccbW+HusbG+2++4dLnoAJWMUd/4QtfKKIv2pgvTPqtKGIbjk/tSEuiZEbRSMt/DAYoGvOoqg1iiTyY6hdoJGAs4qmAoWpwVLETLMfvunD1jsQn7NLoJYOUOeTtAdqItDUe0v7l8OE3UQlMHi4V9a9ChQYoK+ZoKmvLuvUCLmc0T+CMY5Q/o07NCw+PcBVvBAPuaKJ8HXXkttY2HvkLFi7kFSA9hn09flJIz7bxeDxJjCdXPDnEOOhkIG+HAqp5YawOUWPeP7M+cll6MFNb0hH9Gdy4edMVQ1Ahq+gkfSlf/oNgM9QxJOaQMx3CWpe6ziQoCcSFaWyAWlDOKCTksfCob6hH3hzixQpF/Ri14zd8DpXqFpbqNN2kY6FDq4GaAfw4vKlYHEUjgRQSnrWdyJvj0ejdX73pqv1QQauoozuHOg8bntdPsqbvZH/5k0O7e3pYF7abKCkOobBPvNnXNgQfJji7GL3Zf458ngTpd4IOvG9aOp+IIhUvhydNQwUPdcNiXX3deT39aTEUjT6e69r3rfEe+fr/rKKO/uE3v5xDVWeHgJhJziAcJZwmOKipqYXGxpmcQ5PkWSz64wUEDwSjhM0n6BwxDWcUOpBPmzxybWZiRNuYBBQUsIgz5wt51ExUmD1rRnQoM5y0XO+1WHXiVmQZDlTYKr4Jp6SbL2GlxqgsJp5LOEwOHOtGUzcFy2zUNxRecNBJ4AWK70w/ei1/Isn1fKfTcAzBhUVNV2wkKBjN2aEMcVc2d/YMbIeFhGKp3C8p4U/ceOWabpgEq7ijRVb8dTCICQ3vk8Dkc2H3hDpHRv+TMoeNXNQg5hLnFvgxnMZZJ/DZ5PhMCZExw/JlVFXVaCqU9xTnzZuL0TwTUv3pYWQdn/ncDe97BSbJKu5oPd2Rc12rPYBaMuGs7THOpwkmePHhOKO82IcJbF9h9DN2IoIpuon22S7vZlumw+8TE5GQzkUiMUhhxzyOuvTy5adDd18/tlvhtltuuGwbTKJV3NGbNm1CxJC2BxXNdxrhMBUgo/jLC5bR6GUn/d2xTOTUJi9qnNETQlTOdhmfzaHmYigWgpFCHuGpABdctAYGMzkIKpHbb/+Hq34Gk2yTslGyr3/gvxB7ubDvOX40+kOM3mhk+1BC8OBTOZPTNKKBpuVDh85/4kngU6cCifa8g9Pb1w3r3vd+yGMylbXgP976qUu+C1PAJmsDn/Czx57PFPO5RCSk8qaqhk6ihMi7KKOqHDnVRicbqFuU8adu+MqdqZOjHZ5MqZ9I/cE4spWOruOwZNFiTKAKhDT1X2/6+KV3wBSxydr6y1wJfkSXjvAwOkkCHYvmsRvn0a6Px/Yoh/ajmxzM1T+BdIwAqnMhPFHEmRsbZqLTqS+pfC99fO+XYQrZpO2xdvMjD6Gixkyq9Hjj1ftzYeL6UqfNcdgvTvzmrMudTBdQcUFiIkZyBJMe7V0kbI8n4pgQA9/N97y8eTK48v9lk3oFmoe2PPsCahXvCqGUGQ6rJ6rAMeGeWlQ6QgZvAuh4I9jgyVCkgTuIhMOg4M9sNkdTqAwLnX++7cbLvgbUbJxiNmkRTSIT1iY/CdC8BeMjysixff/wadBRh9tcOPIH0DnEOIwXNeFQGLm2wr9CTU31zmA4dP7uSJEuRzHlnExWMeH/fzHBc0UFe9rY9RAEvjMTnY7oDWNdGJfTOx9GfK7M+ACNEgrxDrgSoJGwwA6HCTd88dPre2EK22Q6mkViETkeaxBy2TTSYIU71/P8/p89OjTjnsBlonHYjkKooPaUhCcFZdDHwbU3fekz6ysmd/6tNqkXHOkceuNBq1x+7ex3nAlz5zWCrPgUj8YKKKp9hY7aUjoYpNLRPsCAxIfSq6prv1Pssa+vpKb899gkRTQT/J1VUH7w53/YXzbNFWecsRhWrFgM/b2DKPS38+1tBratCDJ0LjwRbDBO5xRZOXjLdWs2n0pXD6so67h3yx6tRlFWJKLyeqwI55eNUh0qdecOptMRwtvqqgTfXuFwFU6AXH4YMpksZJAjl7AlRVcPq6qtZdF4YuNtH1v3UziFruNRMUdvefLAGsTUhySRzcXUByL4o0o0PE5z0UnkwDTN39ra6o8bkFYqCgzLbQErQmqDQTSaOCpr0au/fvvVh+AUs4nfw4J8efvzr16NkugvIppMLViaHOCdaQO7KVgqQ21tDZbgCu/tEUYPpgahq6+HZTM5YWBggNE4b019I0Z7/TOnopPJJvo6oEI2m1XOXHH+Nqz4sAEdpFkvP8lRQxbF/Yb6ej5fR/MX3qiQ5HI+TdP/Ik0vIeuToaFxFnZf4gsu/eC16vqLP/bK9u2/MOEUsgllHRs2bBHPOnf9BZIkzCIMFmiMlgYUFRWSVUmYQU6urkIpM8CnRimaaQaP2k8RLEjitHdb1ZimIW9G/iwJQo1rOV9zNLb9uw9uWwSnkE2oo0/fQFq8tHx4eJira1Tt0cVN8L4Qj0X5fckfqDmhdQR4EUIbh2QhFNYgkUxg1yTIuTWjLYF4MpCDnOcy5ck7f/DEbDhFbGJ5dEsLzWpg9wmTWbkM9TPq+UhuUFVYJKLxfEelNcmgNIGEnRTBv9BVgJzLKLqTyThGOG2s12mIUWA0JIn/DGYvTGjqv6F4RN9BgEnUbf4am1CMrq2thWVnrMwFJPHjmBRVUZFh5qw6KJct3mhVtdFhGNMa3dvt8eHEMeGfG9/IImIXxi/FZdqBJUmYPDFxuvYSLbF0W+zsuZnT8b1aWsZ9H+a42YQ6mr74ug1XWG7ZaZfD6pUhTeMacjwe4ZstaUerhdFMRE/iQ+iM6858mJGPfTGuadAUU4Awmib8ka0QZpOyJ9G1QAR7p2w63eF5M5hqmqyjo2NKcusJv/r4Oaef7oTVhZ1mOduGKtuFQSTTpMYRAISRhdAmIqoAs9lhKCPdIxix+XAN43u4xbENnTQHimW4f4yJSVKFaCREu2gfLeVzOeagRlW1xKtTp6azJ9zRu3btYqtXL7QDUrR1MDe8E2uQJdihnuW5TCCdOT+c5+0rilIVnU5tKZr1KOtlKBSKUCiV+VgYYTxpIbQZKBaJ8iaAicshm0n9HOXTshFw7fJI0QlDycOVdNLuxKlhFbmePjl7+/bHrHNWXjKoxqRtqb7UYSz75omM1aA6J5axkZobzgvZoSwUiwWBOt+U2+hyEgFZEWhklxIjbYOj/dpZPDmmaQjMcZ7JZDO7JcUqisGQ3l/uda2BAbe19Tok4rtgKlnFMzWxhPCCBdqM8OyqYj5zYSIauQQjep2kKDMkUcYo9UcKSqUSd6xu+h1vnjSpY86Ld9G1XOtFo1D8qcDcNyTBS5dsJZ+zLb2veZvd3Nzsz5FNIZs0StTUxMRYbGtQjDoxs1hKGkZpOYr670T+tlySlfmOYzWgcqc5tivT9Tiw01JGtEmZpt1RNo2XkQi+jHy7X7ScnCcaBUMsl1vSaevw1q3k5CnXZZl87tkE4sa+jdLSpesCXSMtwZAV15BthHVHD+nlcswTmIZRLiL3RjUVaLunjU0Zw5IkHTlIORhRzL6WNjszT7OaH3iAOOGUbGVNNZIvILQIiOli7dq1IhzOS6oqiXlZFKOmLmQhC0k8qNeKe7UQdNPpHCsUDrnNC5o92ApjW/SnpJ0qV8AW/sL9Kccupm3apm3apm3apm3apm3apm3apm3apm1S7b8BTSoMhz1fPA4AAAAASUVORK5CYII=";

interface TournamentBannerProps {
  className?: string;
}

export function TournamentBanner({ className = "" }: TournamentBannerProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Countdown to midnight
  const getSecondsUntilMidnight = useCallback(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  }, []);

  const [secondsLeft, setSecondsLeft] = useState(getSecondsUntilMidnight);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(getSecondsUntilMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, [getSecondsUntilMidnight]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`relative mx-4 mt-2 ${className}`}
      style={{ height: 68 }}
    >
      {/* Trophy image - rotated, overlapping top */}
      <img
        src={TROPHY_SRC}
        alt="Trophy"
        style={{
          width: 62,
          height: 62,
          position: "absolute",
          left: 0,
          top: -6,
          transform: "rotate(13deg)",
          transformOrigin: "top left",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />

      {/* Timer chip (blue-gray) */}
      <motion.div
        whileTap={{ scale: 0.96 }}
        style={{
          position: "absolute",
          left: 30,
          top: 12,
          width: 110,
          height: 43,
          background: "linear-gradient(180deg, #D7E4F0 0%, #EAF1FF 50%, #E9EFF7 100%)",
          boxShadow: "0px 6px 13px rgba(0,0,0,0.25), 0px 4px 0px #98A0B1, 0px -2.4px 4.8px 1.6px rgba(0,0,0,0.20) inset, 0px 3.2px 6.4px 1.6px rgba(255,255,255,0.25) inset",
          borderRadius: 13,
          outline: "1.6px rgba(255,255,255,0.30) solid",
          outlineOffset: "-1.6px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Top gradient sheen */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "50%",
            opacity: 0.3,
            background: "linear-gradient(180deg, rgba(255,255,255,0.60) 0%, rgba(255,255,255,0) 100%)",
            borderTopLeftRadius: 13,
            borderTopRightRadius: 13,
            pointerEvents: "none",
          }}
        />
        <span
          style={{
            color: "#244F25",
            fontSize: 14,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            position: "relative",
            zIndex: 1,
          }}
        >
          {timeStr}
        </span>
      </motion.div>

      {/* Green "Play with friends" button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => navigate("/team", { state: { openCreateRoom: true } })}
        style={{
          position: "absolute",
          right: 0,
          top: 12,
          height: 43,
          paddingLeft: 24,
          paddingRight: 24,
          background: "linear-gradient(180deg, #92FC84 0%, #55F7B3 50%, #4BEA33 100%)",
          boxShadow: "0px 6px 13px rgba(0,0,0,0.25), 0px 4px 0px #21A624, 0px -2.4px 4.8px 1.6px rgba(0,0,0,0.20) inset, 0px 3.2px 6.4px 1.6px rgba(255,255,255,0.25) inset",
          borderRadius: 13,
          outline: "1.6px rgba(255,255,255,0.30) solid",
          outlineOffset: "-1.6px",
          overflow: "hidden",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Top gradient sheen */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "50%",
            opacity: 0.3,
            background: "linear-gradient(180deg, rgba(255,255,255,0.60) 0%, rgba(255,255,255,0) 100%)",
            borderTopLeftRadius: 13,
            borderTopRightRadius: 13,
            pointerEvents: "none",
          }}
        />
        <span
          style={{
            color: "#244F25",
            fontSize: 14,
            fontWeight: 700,
            textTransform: "uppercase",
            position: "relative",
            zIndex: 1,
          }}
        >
          {t("play_with_friends") || "ეთამაშე მეგობრებს"}
        </span>
      </motion.button>
    </motion.div>
  );
}
